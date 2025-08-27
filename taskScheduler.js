const CSVManager = require('./csvManager');
const TelegramBotManager = require('./telegramBot');
const ArchiveManager = require('./archiveManager');
const cron = require('node-cron');
const { TaskStatus, TIMEOUT_SETTINGS, RATE_LIMIT_SETTINGS, TELEGRAM_CHAT_ID } = require('./config');
const TimeHelper = require('./timeHelper');

class TaskScheduler {
    constructor(telegramBot) {
        this.telegramBot = telegramBot;
        this.archiveManager = new ArchiveManager();
        this.isRunning = false;
        this.cronJobs = [];
        this.followUpCount = new Map(); // Track follow-up reminders per task
    }

    /**
     * Start the task scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Task scheduler is already running');
            return;
        }

        console.log('🚀 Starting task scheduler...');

        // Schedule task checks every 5 minutes
        this.scheduleTaskChecks();

        // Schedule 6 hour status reports
        this.scheduleHourlyStatus();

        // Schedule daily archive at 11:55 PM
        this.scheduleDailyArchive();

        // Schedule daily reset at 11:58 PM
        this.scheduleDailyReset();

        // Schedule expired task checks every 10 minutes
        this.scheduleExpiredChecks();

        // Schedule follow-up checks every 5 minutes
        this.scheduleFollowUpChecks();

        this.isRunning = true;
        console.log('✅ Task scheduler started successfully');
    }

    /**
     * Stop the task scheduler
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Task scheduler is not running');
            return;
        }

        console.log('🛑 Stopping task scheduler...');

        // Stop all cron jobs
        this.cronJobs.forEach(job => job.stop());
        this.cronJobs = [];

        this.isRunning = false;
        console.log('✅ Task scheduler stopped');
    }

    /**
     * Check for pending tasks and send them
     */
    async checkTasks() {
        try {
            console.log(`🔍 Checking tasks at ${new Date().toLocaleString()}...`);
            
            // Show current pending responses status
            this.telegramBot.showPendingResponsesStatus();

            // Get all pending tasks first to show total count
            const allPendingTasks = await CSVManager.getTasksByStatus("Pending");
            console.log(`📋 Total pending tasks: ${allPendingTasks.length}`);

            // Get only tasks that are ready to be sent (execution time reached)
            const readyTasks = await CSVManager.getReadyTasks();
            
            if (readyTasks.length === 0) {
                console.log('✅ No tasks ready to send at this time');
                return;
            }

            console.log(`📤 Found ${readyTasks.length} task(s) ready to send`);

            // Send each ready task with rate limiting
            for (let i = 0; i < readyTasks.length; i++) {
                const task = readyTasks[i];
                let retryCount = 0;
                const maxRetries = RATE_LIMIT_SETTINGS.MAX_RETRIES;
                
                while (retryCount < maxRetries) {
                    try {
                        console.log(`📤 Sending task: ${task["TaskID"]} - "${task["Task Name"]}" (attempt ${retryCount + 1}/${maxRetries})`);
                        await this.telegramBot.sendTaskMessage(task);
                        await CSVManager.updateTaskStatusByID(task["TaskID"], TaskStatus.SENT_AND_AWAITING_RESPONSE);
                        console.log(`✅ Task ${task["TaskID"]} sent and status updated`);
                        
                        // Add delay between messages to avoid rate limits
                        if (i < readyTasks.length - 1) {
                            const delaySeconds = RATE_LIMIT_SETTINGS.DELAY_BETWEEN_MESSAGES / 1000;
                            console.log(`⏳ Waiting ${delaySeconds} seconds before next task...`);
                            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_SETTINGS.DELAY_BETWEEN_MESSAGES));
                        }
                        break; // Success, exit retry loop
                        
                    } catch (error) {
                        retryCount++;
                        console.error(`❌ Error sending task ${task["TaskID"]} (attempt ${retryCount}/${maxRetries}): ${error.message}`);
                        
                        // Check if it's a rate limit error
                        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                            const retryAfterMatch = error.message.match(/retry after (\d+)/);
                            const retryAfterSeconds = retryAfterMatch ? parseInt(retryAfterMatch[1]) : 30;
                            
                            console.log(`⏰ Rate limit hit. Waiting ${retryAfterSeconds} seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1000));
                        } else if (retryCount < maxRetries) {
                            // For other errors, wait before retry
                            const retryDelaySeconds = RATE_LIMIT_SETTINGS.RETRY_DELAY / 1000;
                            console.log(`⏳ Waiting ${retryDelaySeconds} seconds before retry...`);
                            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_SETTINGS.RETRY_DELAY));
                        } else {
                            console.error(`❌ Failed to send task ${task["TaskID"]} after ${maxRetries} attempts`);
                        }
                    }
                }
            }

            console.log('✅ Task check complete.');
        } catch (error) {
            console.error(`❌ Error checking tasks: ${error.message}`);
        }
    }

    /**
     * Check for expired responses and update status to EXPIRED
     */
    async checkExpiredResponses() {
        try {
            console.log(`⏰ Checking for expired responses at ${new Date().toLocaleString()}...`);
            
            // Get all tasks with SENT_AND_AWAITING_RESPONSE status
            const awaitingTasks = await CSVManager.getTasksByStatus(TaskStatus.SENT_AND_AWAITING_RESPONSE);
            
            if (awaitingTasks.length === 0) {
                console.log('✅ No tasks awaiting response');
                return;
            }

            console.log(`📋 Found ${awaitingTasks.length} task(s) awaiting response`);
            
            const now = new Date();
            let expiredCount = 0;

            for (const task of awaitingTasks) {
                const responseTime = task["Response Time"];
                
                if (!responseTime) {
                    console.log(`⚠️ Task ${task["TaskID"]} has no response time, skipping`);
                    continue;
                }

                try {
                    // Parse the response time (assuming it's in a readable format)
                    const responseDateTime = new Date(responseTime);
                    
                    if (isNaN(responseDateTime.getTime())) {
                        console.log(`⚠️ Invalid response time for task ${task["TaskID"]}: ${responseTime}`);
                        continue;
                    }

                    // Calculate time difference in minutes
                    const timeDiffMinutes = (now.getTime() - responseDateTime.getTime()) / (1000 * 60);
                    
                    console.log(`⏱️ Task ${task["TaskID"]}: ${timeDiffMinutes.toFixed(1)} minutes since response time`);

                    // Check if timeout exceeded
                    if (timeDiffMinutes > TIMEOUT_SETTINGS.RESPONSE_TIMEOUT) {
                        console.log(`⏰ Task ${task["TaskID"]} has expired (${timeDiffMinutes.toFixed(1)} minutes > ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes)`);
                        
                        // Update status to EXPIRED
                        await CSVManager.updateTaskStatusByID(task["TaskID"], TaskStatus.EXPIRED);
                        expiredCount++;
                        
                        // Reset follow-up count for expired task
                        this.resetFollowUpCount(task["TaskID"]);
                        
                        console.log(`✅ Task ${task["TaskID"]} status updated to EXPIRED`);
                    } else {
                        console.log(`⏳ Task ${task["TaskID"]} still within timeout period`);
                    }

                } catch (error) {
                    console.error(`❌ Error processing task ${task["TaskID"]}: ${error.message}`);
                }
            }

            if (expiredCount > 0) {
                console.log(`✅ ${expiredCount} task(s) marked as expired`);
                
                // Build list of expired tasks
                let expiredTasksList = '';
                for (const task of awaitingTasks) {
                    const responseTime = task["Response Time"];
                    if (responseTime) {
                        const responseDateTime = new Date(responseTime);
                        const timeDiffMinutes = (now.getTime() - responseDateTime.getTime()) / (1000 * 60);
                        
                        if (timeDiffMinutes > TIMEOUT_SETTINGS.RESPONSE_TIMEOUT) {
                            const taskId = task["TaskID"];
                            const taskName = task["Task Name"];
                            expiredTasksList += `• ${taskId} - ${taskName}\n`;
                        }
                    }
                }
                
                // Send notification to Telegram with task list
                try {
                    const notificationMessage = `⏰ *${expiredCount} task(s) have expired due to no response within ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes.*\n\n📋 *Expired Tasks:*\n${expiredTasksList}`;
                    
                    await this.telegramBot.bot.sendMessage(
                        TELEGRAM_CHAT_ID,
                        notificationMessage,
                        { parse_mode: "Markdown" }
                    );
                } catch (error) {
                    console.error(`❌ Error sending expiration notification: ${error.message}`);
                }
            } else {
                console.log('✅ No tasks expired in this check');
            }

        } catch (error) {
            console.error(`❌ Error checking expired responses: ${error.message}`);
        }
    }

    /**
     * Check for tasks that need follow-up reminders
     */
    async checkFollowUpTasks() {
        try {
            console.log(`📢 Checking for follow-up reminders at ${new Date().toLocaleString()}...`);
            
            // Get all tasks with SENT_AND_AWAITING_RESPONSE status
            const awaitingTasks = await CSVManager.getTasksByStatus(TaskStatus.SENT_AND_AWAITING_RESPONSE);
            
            if (awaitingTasks.length === 0) {
                console.log('✅ No tasks awaiting response for follow-up');
                return;
            }

            console.log(`📋 Found ${awaitingTasks.length} task(s) awaiting response`);
            
            const now = new Date();
            let followUpCount = 0;

            for (const task of awaitingTasks) {
                const responseTime = task["Response Time"];
                
                if (!responseTime) {
                    console.log(`⚠️ Task ${task["TaskID"]} has no response time, skipping`);
                    continue;
                }

                try {
                    // Parse the response time
                    const responseDateTime = new Date(responseTime);
                    
                    if (isNaN(responseDateTime.getTime())) {
                        console.log(`⚠️ Invalid response time for task ${task["TaskID"]}: ${responseTime}`);
                        continue;
                    }

                    // Calculate time difference in minutes
                    const timeDiffMinutes = (now.getTime() - responseDateTime.getTime()) / (1000 * 60);
                    
                    // Check if task needs follow-up (between 20 minutes and RESPONSE_TIMEOUT)
                    if (timeDiffMinutes >= 20 && timeDiffMinutes < TIMEOUT_SETTINGS.RESPONSE_TIMEOUT) {
                        const taskId = task["TaskID"];
                        const currentFollowUpCount = this.followUpCount.get(taskId) || 0;
                        const maxFollowUps = 2; // Maximum 2 follow-up reminders per task
                        
                        if (currentFollowUpCount < maxFollowUps) {
                            console.log(`📢 Task ${taskId} needs follow-up (${timeDiffMinutes.toFixed(1)} minutes since sent) - Follow-up ${currentFollowUpCount + 1}/${maxFollowUps}`);
                            
                            // Send follow-up message
                            await this.sendFollowUpMessage(task, timeDiffMinutes);
                            followUpCount++;
                            
                            // Increment follow-up count for this task
                            this.followUpCount.set(taskId, currentFollowUpCount + 1);
                            
                            console.log(`✅ Follow-up ${currentFollowUpCount + 1}/${maxFollowUps} sent for task ${taskId}`);
                        } else {
                            console.log(`⏳ Task ${taskId} already received maximum follow-ups (${maxFollowUps}/${maxFollowUps})`);
                        }
                    } else {
                        console.log(`⏳ Task ${task["TaskID"]} doesn't need follow-up yet (${timeDiffMinutes.toFixed(1)} minutes)`);
                    }

                } catch (error) {
                    console.error(`❌ Error processing follow-up for task ${task["TaskID"]}: ${error.message}`);
                }
            }

            if (followUpCount > 0) {
                console.log(`✅ ${followUpCount} follow-up reminder(s) sent`);
            } else {
                console.log('✅ No follow-up reminders needed');
            }

        } catch (error) {
            console.error(`❌ Error checking follow-up tasks: ${error.message}`);
        }
    }

    /**
     * Reset follow-up count for a specific task
     */
    resetFollowUpCount(taskId) {
        if (this.followUpCount.has(taskId)) {
            this.followUpCount.delete(taskId);
            console.log(`🔄 Follow-up count reset for task ${taskId}`);
        }
    }

    /**
     * Send follow-up message for a specific task
     */
    async sendFollowUpMessage(task, timeDiffMinutes) {
        try {
            const taskId = task["TaskID"];
            const taskName = task["Task Name"];
            const remainingMinutes = Math.ceil(TIMEOUT_SETTINGS.RESPONSE_TIMEOUT - timeDiffMinutes);
            const formattedExecutionTime = TimeHelper.formatTimeAsAMPM(task["Execution Time"]);
            
            const followUpMessage = `📢 *Follow-up Reminder*\n\n` +
                `Task: *${taskId}*\n` +
                `Description: ${taskName}\n` +
                `⏰ Execution Time: ${formattedExecutionTime}\n\n` +
                `⏰ This task was sent ${Math.floor(timeDiffMinutes)} minutes ago.\n` +
                `⏳ You have approximately ${remainingMinutes} minutes remaining to respond.\n\n` +
                `💬 Please respond with:\n` +
                `\`Task-${taskId}: yes\` or \`Task-${taskId}: no\`\n\n` +
                `⚠️ If no response is received within ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes, the task will be marked as EXPIRED.`;

            await this.telegramBot.bot.sendMessage(
                TELEGRAM_CHAT_ID,
                followUpMessage,
                { parse_mode: "Markdown" }
            );

        } catch (error) {
            console.error(`❌ Error sending follow-up message for task ${task["TaskID"]}: ${error.message}`);
        }
    }

    /**
     * Show current status
     */
    showStatus() {
        console.log(`📊 Status Update at ${new Date().toLocaleString()}:`);
        this.telegramBot.showPendingResponsesStatus();
    }

    /**
     * Send hourly status report
     */
    async sendHourlyStatus() {
        try {
            await this.telegramBot.sendTasksStatus();
        } catch (error) {
            console.error(`❌ Error sending hourly status: ${error.message}`);
        }
    }

    /**
     * Get current cron schedule information
     */
    getScheduleInfo() {
        return {
            taskChecks: '*/5 * * * * (every 5 minutes)',
            hourlyStatus: '0 */6 * * * (every 6 hours at minute 0)',
            dailyArchive: '55 23 * * * (every day at 11:55 PM UTC)',
            dailyReset: '58 23 * * * (every day at 11:58 PM UTC)',
            expiredChecks: '*/10 * * * * (every 10 minutes)',
            followUpChecks: '*/5 * * * * (every 5 minutes)',
            totalJobs: this.cronJobs.length,
            isRunning: this.isRunning
        };
    }

    /**
     * Archive tasks daily at 11:55 PM
     */
    async archiveDailyTasks() {
        try {
            console.log('📁 Starting daily archive process...');
            const success = await this.archiveManager.archiveTasks();
            
            if (success) {
                // Send notification to Telegram
                await this.telegramBot.bot.sendMessage(
                    TELEGRAM_CHAT_ID, 
                    '📁 Daily tasks backup completed successfully! ✅'
                );
            } else {
                // Send error notification
                await this.telegramBot.bot.sendMessage(
                    TELEGRAM_CHAT_ID, 
                    '❌ Daily tasks backup failed! Please check logs.'
                );
            }
        } catch (error) {
            console.error(`❌ Error in daily archive: ${error.message}`);
        }
    }

    /**
     * Schedule task checks every 5 minutes
     */
    scheduleTaskChecks() {
        const job = cron.schedule('*/5 * * * *', async () => {
            console.log('⏰ Running scheduled task checks...');
            await this.checkTasks();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 Task checks scheduled: every 5 minutes');
    }

    /**
     * Schedule 6-hourly status reports
     */
    scheduleHourlyStatus() {
        const job = cron.schedule('0 */6 * * *', async () => {
            console.log('📊 Running 6-hourly status report...');
            await this.sendHourlyStatus();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 6-hourly status reports scheduled: every 6 hours at minute 0');
    }

    /**
     * Schedule daily archive at 11:55 PM
     */
    scheduleDailyArchive() {
        const job = cron.schedule('55 23 * * *', async () => {
            console.log('📁 Running daily archive...');
            await this.archiveDailyTasks();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 Daily archive scheduled: every day at 11:55 PM UTC');
    }

    /**
     * Schedule expired task checks every 10 minutes
     */
    scheduleExpiredChecks() {
        const job = cron.schedule('*/10 * * * *', async () => {
            console.log('⏰ Checking for expired tasks...');
            await this.checkExpiredResponses();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 Expired task checks scheduled: every 10 minutes');
    }

    /**
     * Schedule follow-up checks every 5 minutes
     */
    scheduleFollowUpChecks() {
        const job = cron.schedule('*/5 * * * *', async () => {
            console.log('📢 Running scheduled follow-up checks...');
            await this.checkFollowUpTasks();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 Follow-up checks scheduled: every 5 minutes');
    }

    /**
     * Schedule daily reset at 11:58 PM
     */
    scheduleDailyReset() {
        const job = cron.schedule('58 23 * * *', async () => {
            console.log('🔄 Running scheduled daily reset...');
            await this.performDailyReset();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.cronJobs.push(job);
        console.log('📅 Daily reset scheduled: every day at 11:58 PM UTC');
    }

    /**
     * Perform daily reset of all tasks
     */
    async performDailyReset() {
        try {
            console.log('🔄 Starting scheduled daily reset process...');
            
            // Send notification to Telegram
            await this.telegramBot.bot.sendMessage(
                TELEGRAM_CHAT_ID, 
                '🔄 Starting scheduled daily reset process...'
            );
            
            // Call the daily reset function from telegram bot
            await this.telegramBot.handleDailyResetCommand({ 
                from: { username: 'System', first_name: 'System' } 
            });
            
        } catch (error) {
            console.error(`❌ Error in scheduled daily reset: ${error.message}`);
            await this.telegramBot.bot.sendMessage(
                TELEGRAM_CHAT_ID, 
                '❌ Scheduled daily reset failed! Please check logs.'
            );
        }
    }
}

module.exports = TaskScheduler;



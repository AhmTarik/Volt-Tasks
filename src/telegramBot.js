const TelegramBot = require("node-telegram-bot-api");
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TaskStatus, CSV_FILE_PATH } = require('./config');
const CSVManager = require('./csvManager');
const TimeHelper = require('./timeHelper');
const fs = require('fs');
const csv = require('csv-parser');

class TelegramBotManager {
    constructor() {
        this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
        this.pendingResponses = new Map(); // Track pending responses
        
        this.setupEventHandlers();
    }

    /**
     * Setup bot event handlers
     */
    setupEventHandlers() {
        // Handle callback queries (button responses)
        this.bot.on('callback_query', this.handleCallbackQuery.bind(this));
        
        // Handle text messages for task responses
        this.bot.on('message', this.handleTextMessage.bind(this));
        
        // Error handling
        this.bot.on('error', (error) => {
            console.error('❌ Bot error:', error);
        });

        this.bot.on('polling_error', (error) => {
            console.error('❌ Polling error:', error);
        });
    }

    /**
     * Handle callback queries from button clicks
     */
    async handleCallbackQuery(callbackQuery) {
        const { data, from } = callbackQuery;
        const [response, taskID] = data.split('_');
        
        try {
            console.log(`🔄 Processing response: ${response} for task ${taskID} from ${from.username || from.first_name}`);
            
            // Handle test messages
            if (taskID && taskID.startsWith('TEST-')) {
                await this.handleTestResponse(callbackQuery, response, taskID, from);
                return;
            }
            
            // Handle debug messages
            if (taskID && taskID.startsWith('DEBUG-')) {
                await this.handleDebugResponse(callbackQuery, response, taskID, from);
                return;
            }
            
            // Check if task is still pending response
            if (!this.pendingResponses.has(taskID)) {
                console.log(`⚠️ Task ${taskID} is no longer pending response`);
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: 'هذه المهمة لم تعد تنتظر رداً'
                });
                return;
            }
            
            // Update task status based on response
            const newStatus = response === 'yes' ? TaskStatus.COMPLETED : TaskStatus.FAILED;
            await CSVManager.updateTaskStatusByID(taskID, newStatus, from.username || from.first_name);
            
            // Remove from pending responses
            this.pendingResponses.delete(taskID);
            
            // Reset follow-up count for this task
            if (this.taskScheduler) {
                this.taskScheduler.resetFollowUpCount(taskID);
            }
            
            // Answer the callback query with appropriate message
            const notificationText = response === 'yes' 
                ? 'تم تأكيد إنجاز المهمة ✅' 
                : 'تم تسجيل عدم إنجاز المهمة ❌';
            await this.bot.answerCallbackQuery(callbackQuery.id, { text: notificationText });
            
            // Get task details for message update
            const taskDetails = await CSVManager.getTaskByID(taskID);
            const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
            const updatedMessage = `📋 *${taskID} - ${taskDetails["Task Name"]}*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n⏰ ${new Date().toLocaleString()}`;
            
            await this.bot.editMessageText(updatedMessage, {
                chat_id: TELEGRAM_CHAT_ID,
                message_id: callbackQuery.message.message_id,
                parse_mode: "Markdown"
            });
            
            console.log(`✅ Response processed successfully: ${taskID} → ${newStatus} by ${from.username || from.first_name}`);
            
        } catch (error) {
            console.error(`❌ Error handling callback query: ${error.message}`);
            await this.bot.answerCallbackQuery(callbackQuery.id, {
                text: 'حدث خطأ في معالجة الرد'
            });
        }
    }

    /**
     * Handle text messages for task responses
     */
    async handleTextMessage(message) {
        // Only process messages from the configured chat
        if (message.chat.id.toString() !== TELEGRAM_CHAT_ID) {
            return;
        }

        // Skip bot messages and non-text messages
        if (message.from.is_bot || !message.text) {
            return;
        }

        const text = message.text.trim();
        console.log(`📨 Received message: "${text}" from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);

        // Handle clear command
        if (text === 'tarik-clear-all') {
            await this.handleClearCommand(message);
            return;
        }

        // Handle tasks status command
        if (text === 'tasks-status') {
            await this.handleTasksStatusCommand(message);
            return;
        }

        // Handle archive command
        if (text === 'archive-tasks') {
            await this.handleArchiveCommand(message);
            return;
        }

        // Handle list backups command
        if (text === 'list-backups') {
            await this.handleListBackupsCommand(message);
            return;
        }

        // Handle schedule info command
        if (text === 'schedule-info') {
            await this.handleScheduleInfoCommand(message);
            return;
        }

        // Handle daily reset command
        if (text === 'daily-reset') {
            await this.handleDailyResetCommand(message);
            return;
        }

        // Check if message follows the format "Task-{{taskID}}: {{answer}}"
        const taskResponseMatch = text.match(/^Task-([A-Z0-9-]+)\s*:\s*(yes|no)$/i);
        
        if (!taskResponseMatch) {
            // Message doesn't follow the format, send help message
            const helpMessage = `🤖 *Volt Tasks Bot Help*

📝 *How to respond to tasks:*
Use this format: \`Task-{{taskID}}: {{answer}}\`

✅ *Valid answers:* \`yes\` or \`no\`

📋 *Examples:*
• \`Task-001: yes\`
• \`Task-002: no\`

📊 *Commands:*
• \`tasks-status\` - Show daily tasks status
• \`daily-reset\` - Trigger daily archive/reset
• \`archive-tasks\` - Manual backup
• \`list-backups\` - View backups
• \`schedule-info\` - Show schedule info

💡 *Need help?* Contact the bot administrator.`;
            
            try {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, helpMessage, {
                    parse_mode: "Markdown",
                    reply_to_message_id: message.message_id
                });
                console.log(`📝 Sent format help message to ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);
            } catch (error) {
                console.error(`❌ Error sending help message: ${error.message}`);
            }
            return;
        }

        const [, taskID, answer] = taskResponseMatch;
        const responder = message.from.username || `${message.from.first_name} ${message.from.last_name}`;
        
        console.log(`🔄 Processing text response: Task ${taskID}, Answer: "${answer}" from ${responder}`);

        try {
            // Check if task exists
            const task = await CSVManager.getTaskByID(taskID);
            if (!task) {
                const errorMessage = `❌ *خطأ*\n\nالمهمة \`${taskID}\` غير موجودة في قاعدة البيانات.`;
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, errorMessage, {
                    parse_mode: "Markdown",
                    reply_to_message_id: message.message_id
                });
                console.log(`⚠️ Task ${taskID} not found in database`);
                return;
            }

            // Check if task is already expired
            if (task["Status"] === TaskStatus.EXPIRED) {
                const errorMessage = `❌ *خطأ*\n\nالمهمة \`${taskID}\` منتهية الصلاحية ولا يمكن تحديثها.\n\n⏰ تم انتهاء مهلة الرد على هذه المهمة.`;
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, errorMessage, {
                    parse_mode: "Markdown",
                    reply_to_message_id: message.message_id
                });
                console.log(`⚠️ Task ${taskID} is expired and cannot be updated`);
                return;
            }

            // Determine status based on answer (only yes/no allowed)
            let newStatus;
            let statusText;
            
            const answerLower = answer.toLowerCase().trim();
            
            if (answerLower === 'yes') {
                newStatus = TaskStatus.COMPLETED;
                statusText = '✅ تم الإنجاز';
            } else if (answerLower === 'no') {
                newStatus = TaskStatus.FAILED;
                statusText = '❌ لم يتم الإنجاز';
            } else {
                // This shouldn't happen due to regex validation, but just in case
                const errorMessage = `❌ *خطأ*\n\nالإجابة يجب أن تكون \`yes\` أو \`no\` فقط.`;
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, errorMessage, {
                    parse_mode: "Markdown",
                    reply_to_message_id: message.message_id
                });
                return;
            }

            // Update task status in CSV
            await CSVManager.updateTaskStatusByID(taskID, newStatus, responder);
            
            // Remove from pending responses if it was there
            if (this.pendingResponses.has(taskID)) {
                this.pendingResponses.delete(taskID);
            }
            
            // Reset follow-up count for this task
            if (this.taskScheduler) {
                this.taskScheduler.resetFollowUpCount(taskID);
            }

            // Send confirmation message
            const confirmationMessage = `✅ *تم تحديث المهمة*\n\n📋 *${taskID} - ${task["Task Name"]}*\n\n${statusText}\n\n👤 الرد من: ${responder}\n\n⏰ ${new Date().toLocaleString()}`;
            
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, confirmationMessage, {
                parse_mode: "Markdown",
                reply_to_message_id: message.message_id
            });

            console.log(`✅ Text response processed successfully: ${taskID} → ${newStatus} by ${responder}`);

        } catch (error) {
            console.error(`❌ Error processing text response: ${error.message}`);
            
            const errorMessage = `❌ *خطأ في معالجة الرد*\n\nحدث خطأ أثناء تحديث المهمة \`${taskID}\`.\n\nالرجاء المحاولة مرة أخرى.`;
            
            try {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, errorMessage, {
                    parse_mode: "Markdown",
                    reply_to_message_id: message.message_id
                });
            } catch (sendError) {
                console.error(`❌ Error sending error message: ${sendError.message}`);
            }
        }
    }

    /**
     * Handle test message responses
     */
    async handleTestResponse(callbackQuery, response, taskID, from) {
        console.log(`🧪 Test message response received`);
        
        // Answer the callback query
        const notificationText = response === 'yes' 
            ? 'تم تأكيد إنجاز المهمة ✅' 
            : 'تم تسجيل عدم إنجاز المهمة ❌';
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: notificationText });
        
        // Update the message
        const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
        const updatedMessage = `🧪 *QUICK TEST*\n\n📋 *${taskID} - Button Verification*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n⏰ ${new Date().toLocaleString()}\n\n✅ Test completed successfully!`;
        
        await this.bot.editMessageText(updatedMessage, {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: callbackQuery.message.message_id,
            parse_mode: "Markdown"
        });
        
        console.log(`✅ Test message updated successfully!`);
        console.log(`📊 Test Status: ${response === 'yes' ? 'COMPLETED' : 'FAILED'}`);
    }

    /**
     * Handle debug message responses
     */
    async handleDebugResponse(callbackQuery, response, taskID, from) {
        console.log(`🔍 Debug message response received`);
        
        // Answer the callback query
        const notificationText = response === 'yes' 
            ? 'تم تأكيد إنجاز المهمة ✅' 
            : 'تم تسجيل عدم إنجاز المهمة ❌';
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: notificationText });
        
        // Update the message
        const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
        const updatedMessage = `🔍 *DEBUG TEST*\n\n📋 *${taskID} - Callback Test*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n⏰ ${new Date().toLocaleString()}\n\n✅ Debug test completed!`;
        
        await this.bot.editMessageText(updatedMessage, {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: callbackQuery.message.message_id,
            parse_mode: "Markdown"
        });
        
        console.log(`✅ Debug message updated successfully!`);
        console.log(`📊 Debug Status: ${response === 'yes' ? 'COMPLETED' : 'FAILED'}`);
    }

    /**
     * Send a task message (text-based, no buttons)
     */
    async sendTaskMessage(task) {
        // Format execution time as AM/PM using common utility
        const formattedExecutionTime = TimeHelper.formatTimeAsAMPM(task["Execution Time"]);

        const message = `📋 *${task["TaskID"]} - ${task["Task Name"]}*\n\n${task["Description"]}\n\n⏰ وقت التنفيذ: ${formattedExecutionTime}\n
        \n💬 *للرد على هذه المهمة، اكتب:*\n\`Task-${task["TaskID"]}: yes\`\n\`Task-${task["TaskID"]}: no\`\n\n⏰ *الوقت المحدد: 30 دقيقة*`;

        try {
            const sentMessage = await this.bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                parse_mode: "Markdown"
            });

            // Store pending response
            this.pendingResponses.set(task["TaskID"], {
                messageId: sentMessage.message_id,
                timestamp: new Date(),
                taskID: task["TaskID"],
                taskName: task["Task Name"],
                executionTime: task["Execution Time"]
            });

            console.log(`✅ Task sent successfully: ${task["TaskID"]} - "${task["Task Name"]}" at ${new Date().toLocaleString()}`);
            console.log(`⏰ Waiting for text response (timeout: 30 minutes)`);

            return sentMessage;
        } catch (error) {
            // Enhanced error handling for rate limits
            if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
                const retryAfterMatch = error.message.match(/retry after (\d+)/);
                const retryAfterSeconds = retryAfterMatch ? parseInt(retryAfterMatch[1]) : 30;
                
                console.error(`❌ Rate limit exceeded for task ${task["TaskID"]}. Retry after ${retryAfterSeconds} seconds.`);
                throw new Error(`Rate limit exceeded. Retry after ${retryAfterSeconds} seconds.`);
            } else {
                console.error(`❌ Failed to send task message: ${error.message}`);
                throw error;
            }
        }
    }

    /**
     * Send a test message
     */
    async sendTestMessage(taskID = 'TEST-001', title = 'Button Test') {
        const message = `🧪 *QUICK TEST*\n\n📋 *${taskID} - ${title}*\n\nThis is a test to verify button functionality\n\n🕒 ${new Date().toLocaleTimeString()}\n\nهل تم إنجاز هذه المهمة؟`;
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: `✅ Yes ${taskID}`, callback_data: `yes_${taskID}` },
                    { text: `❌ No ${taskID}`, callback_data: `no_${taskID}` }
                ]
            ]
        };

        try {
            const sentMessage = await this.bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                parse_mode: "Markdown",
                reply_markup: keyboard
            });

            console.log(`✅ Test message sent! Message ID: ${sentMessage.message_id}`);
            return sentMessage;
        } catch (error) {
            console.error(`❌ Failed to send test message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check for expired responses and update them
     */
    async checkExpiredResponses() {
        const now = new Date();
        const expiredTasks = [];

        for (const [taskID, taskData] of this.pendingResponses.entries()) {
            const timeDiff = now - taskData.timestamp;
            const minutesDiff = timeDiff / (1000 * 60);

            if (minutesDiff >= 30) { // 30 minutes timeout
                expiredTasks.push(taskID);
            }
        }

        for (const taskID of expiredTasks) {
            try {
                await CSVManager.updateTaskStatusByID(taskID, TaskStatus.EXPIRED);
                this.pendingResponses.delete(taskID);
                console.log(`⏰ Task ${taskID} expired and status updated`);
            } catch (error) {
                console.error(`❌ Error updating expired task ${taskID}: ${error.message}`);
            }
        }

        return expiredTasks.length;
    }

    /**
     * Show current pending responses status
     */
    showPendingResponsesStatus() {
        console.log(`📊 Pending Responses Status (${this.pendingResponses.size} tasks):`);
        
        if (this.pendingResponses.size === 0) {
            console.log('   No pending responses');
            return;
        }

        for (const [taskID, taskData] of this.pendingResponses.entries()) {
            const timeDiff = new Date() - taskData.timestamp;
            const minutesRemaining = Math.max(0, 30 - Math.floor(timeDiff / (1000 * 60)));
            console.log(`   ${taskID}: ${taskData.taskName} (${minutesRemaining}m remaining)`);
        }
    }

    /**
     * Stop the bot
     */
    stop() {
        if (this.bot) {
            this.bot.stopPolling();
            console.log('🛑 Bot stopped');
        }
    }

    /**
     * Clear all messages from the group
     */
    async clearAllMessages() {
        try {
            console.log('🧹 Starting to clear all messages from the group...');
            
            // Get recent messages (Telegram API limits to last 100 messages)
            const updates = await this.bot.getUpdates({ limit: 100 });
            const messageIds = [];
            
            // Collect message IDs from the target chat
            for (const update of updates) {
                if (update.message && update.message.chat.id.toString() === TELEGRAM_CHAT_ID) {
                    messageIds.push(update.message.message_id);
                }
            }
            
            console.log(`📋 Found ${messageIds.length} messages to delete`);
            
            if (messageIds.length === 0) {
                console.log('✅ No messages found to delete');
                return;
            }
            
            // Delete messages in batches to avoid rate limits
            const batchSize = 10;
            let deletedCount = 0;
            
            for (let i = 0; i < messageIds.length; i += batchSize) {
                const batch = messageIds.slice(i, i + batchSize);
                
                for (const messageId of batch) {
                    try {
                        await this.bot.deleteMessage(TELEGRAM_CHAT_ID, messageId);
                        deletedCount++;
                        console.log(`🗑️ Deleted message ${messageId}`);
                    } catch (error) {
                        console.log(`⚠️ Could not delete message ${messageId}: ${error.message}`);
                    }
                }
                
                // Wait a bit between batches to avoid rate limits
                if (i + batchSize < messageIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            console.log(`✅ Successfully deleted ${deletedCount} messages`);
            
        } catch (error) {
            console.error(`❌ Error clearing messages: ${error.message}`);
            throw error;
        }
    }

    /**
     * Clear messages by sending a command
     */
    async handleClearCommand(message) {
        try {
            console.log(`🧹 Clear command received from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);
            
            // Send confirmation message
            const confirmMessage = await this.bot.sendMessage(TELEGRAM_CHAT_ID, 
                '🧹 *Clearing all messages...*\n\nThis may take a few moments.', 
                { parse_mode: "Markdown" }
            );
            
            // Clear all messages
            await this.clearAllMessages();
            
            // Update confirmation message
            await this.bot.editMessageText(
                '✅ *All messages cleared successfully!*\n\nGroup is now clean.',
                {
                    chat_id: TELEGRAM_CHAT_ID,
                    message_id: confirmMessage.message_id,
                    parse_mode: "Markdown"
                }
            );
            
            // Delete the confirmation message after 5 seconds
            setTimeout(async () => {
                try {
                    await this.bot.deleteMessage(TELEGRAM_CHAT_ID, confirmMessage.message_id);
                } catch (error) {
                    console.log('Could not delete confirmation message');
                }
            }, 5000);
            
        } catch (error) {
            console.error(`❌ Error handling clear command: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, 
                '❌ *Error clearing messages*\n\nPlease try again later.',
                { parse_mode: "Markdown" }
            );
        }
    }

    /**
     * Send daily tasks status message
     */
    async sendTasksStatus() {
        try {
            console.log('📊 Sending daily tasks status...');
            
            // Get all tasks from today
            const todayTasks = await this.getTodayTasks();
            
            if (todayTasks.length === 0) {
                const noTasksMessage = `📊 *Daily Tasks Status*\n\n📅 ${new Date().toLocaleDateString()}\n⏰ ${new Date().toLocaleTimeString()}\n\n❌ No tasks found for today.`;
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, noTasksMessage, { parse_mode: "Markdown" });
                return;
            }

            // Create status message
            let statusMessage = `📊 *Daily Tasks Status*\n\n📅 ${new Date().toLocaleDateString()}\n⏰ ${new Date().toLocaleTimeString()}\n\n`;
            
            // Group tasks by status
            const tasksByStatus = {
                'Pending': [],
                'SentAndAwaitingResponse': [],
                'Completed': [],
                'Failed': [],
                'Expired': []
            };

            // Categorize tasks
            for (const task of todayTasks) {
                const status = task["Status"] || 'Pending';
                if (tasksByStatus[status]) {
                    tasksByStatus[status].push(task);
                }
            }

            // Add tasks to message by status
            for (const [status, tasks] of Object.entries(tasksByStatus)) {
                if (tasks.length > 0) {
                    statusMessage += `\n*${status} (${tasks.length}):*\n`;
                    
                    for (const task of tasks) {
                        const taskId = task["TaskID"] || '';
                        const description = task["Task Name"] || 'No description';
                        const respondedBy = task["Responded By"] || '';
                        const responseTime = task["Response Time"] || '';
                        const executionTime = task["Execution Time"] || '';
                        
                        // Format times using common utilities
                        const formattedResponseTime = TimeHelper.formatTimeAsAMPM(responseTime);
                        const formattedExecutionTime = TimeHelper.formatTimeAsAMPM(executionTime);
                        
                        statusMessage += `• ${taskId} - ${description} - ${respondedBy} - ${status === TaskStatus.COMPLETED ? formattedResponseTime : formattedExecutionTime}\n`;
                    }
                }
            }

            // Add summary
            const totalTasks = todayTasks.length;
            const completedTasks = tasksByStatus['Completed'].length;
            const failedTasks = tasksByStatus['Failed'].length;
            const pendingTasks = tasksByStatus['Pending'].length + tasksByStatus['SentAndAwaitingResponse'].length;
            const expiredTasks = tasksByStatus['Expired'].length;

            statusMessage += `\n📈 *Summary:*\n`;
            statusMessage += `• Total: ${totalTasks}\n`;
            statusMessage += `• Completed: ${completedTasks}\n`;
            statusMessage += `• Failed: ${failedTasks}\n`;
            statusMessage += `• Pending: ${pendingTasks}\n`;
            statusMessage += `• Expired: ${expiredTasks}\n`;

            // Send the status message
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, statusMessage, { parse_mode: "Markdown" });
            console.log(`✅ Daily tasks status sent successfully (${totalTasks} tasks)`);

        } catch (error) {
            console.error(`❌ Error sending tasks status: ${error.message}`);
        }
    }

    /**
     * Get all tasks from today
     */
    async getTodayTasks() {
        return new Promise((resolve, reject) => {
            const tasks = [];
            const now = new Date();
            
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    // Check if task's execution time has passed today
                    const executionTime = row["Execution Time"];
                    if (executionTime) {
                        // Convert execution time to datetime object
                        const taskDateTime = TimeHelper.executionTimeToDateTime(executionTime);
                        
                        if (taskDateTime && taskDateTime <= now) {
                            tasks.push(row);
                        }
                    }
                })
                .on("end", () => {
                    resolve(tasks);
                })
                .on("error", reject);
        });
    }

    /**
     * Handle tasks status command
     */
    async handleTasksStatusCommand(message) {
        try {
            console.log(`📊 Tasks status command received from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);
            await this.sendTasksStatus();
        } catch (error) {
            console.error(`❌ Error handling tasks status command: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, 
                '❌ *Error getting tasks status*\n\nPlease try again later.',
                { parse_mode: "Markdown" }
            );
        }
    }

    /**
     * Handle archive command
     */
    async handleArchiveCommand(message) {
        try {
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, '📁 Starting manual archive process...');
            
            const ArchiveManager = require('./archiveManager');
            const archiveManager = new ArchiveManager();
            const success = await archiveManager.archiveTasks();
            
            if (success) {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, '✅ Manual archive completed successfully!');
            } else {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, '❌ Manual archive failed! Please check logs.');
            }
        } catch (error) {
            console.error(`❌ Error in manual archive: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, '❌ Error during manual archive process.');
        }
    }

    /**
     * Handle list backups command
     */
    async handleListBackupsCommand(message) {
        try {
            const ArchiveManager = require('./archiveManager');
            const archiveManager = new ArchiveManager();
            const backups = archiveManager.getBackupFiles();
            
            if (backups.length === 0) {
                await this.bot.sendMessage(TELEGRAM_CHAT_ID, '📋 No backup files found.');
                return;
            }

            let backupList = '📋 *Available Backups:*\n\n';
            
            for (const filename of backups.slice(0, 10)) { // Show last 10 backups
                const info = archiveManager.getBackupInfo(filename);
                if (info) {
                    backupList += `📁 *${filename}*\n`;
                    backupList += `   📊 Size: ${info.sizeKB} KB\n`;
                    backupList += `   📅 Created: ${info.created.toLocaleDateString()}\n\n`;
                }
            }

            if (backups.length > 10) {
                backupList += `... and ${backups.length - 10} more backups`;
            }

            await this.bot.sendMessage(TELEGRAM_CHAT_ID, backupList, { parse_mode: "Markdown" });
        } catch (error) {
            console.error(`❌ Error listing backups: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, '❌ Error listing backup files.');
        }
    }

    /**
     * Handle schedule info command
     */
    async handleScheduleInfoCommand(message) {
        try {
            console.log(`📊 Schedule info command received from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);
            
            // Get schedule info from the task scheduler
            const TaskScheduler = require('./taskScheduler');
            const scheduleInfo = {
                'Task Checks': '*/5 * * * * (every 5 minutes)',
                '6-Hourly Status Reports': '0 */6 * * * (every 6 hours at minute 0)',
                'Daily Archive': '55 23 * * * (every day at 11:55 PM UTC)',
                'Daily Reset': '58 23 * * * (every day at 11:58 PM UTC)',
                'Expired Task Checks': '*/10 * * * * (every 10 minutes)'
            };

            const now = new Date();
            let scheduleMessage = `📊 *Current Schedule Information*\n\n📅 ${now.toLocaleDateString()}\n⏰ ${now.toLocaleTimeString()}\n\n`;
            
            for (const [task, schedule] of Object.entries(scheduleInfo)) {
                scheduleMessage += `*${task}:* \`${schedule}\`\n`;
            }

            scheduleMessage += `\n💡 *Commands:*\n`;
            scheduleMessage += `• \`daily-reset\` - Manual daily reset\n`;
            scheduleMessage += `• \`archive-tasks\` - Manual backup\n`;
            scheduleMessage += `• \`list-backups\` - View backups\n`;
            scheduleMessage += `• \`tasks-status\` - Daily status\n`;

            await this.bot.sendMessage(TELEGRAM_CHAT_ID, scheduleMessage, { parse_mode: "Markdown" });
            console.log(`✅ Schedule info sent successfully.`);
        } catch (error) {
            console.error(`❌ Error handling schedule info command: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, 
                '❌ *Error getting schedule info*\n\nPlease try again later.',
                { parse_mode: "Markdown" }
            );
        }
    }

    /**
     * Handle daily reset command
     */
    async handleDailyResetCommand(message) {
        try {
            console.log(`🔄 Daily reset command received from ${message.from.username || `${message.from.first_name} ${message.from.last_name}`}`);
            
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, '🔄 Starting daily reset process...');
            
            // Read the CSV file
            const fs = require('fs');
            const csv = require('csv-parser');
            const createCsvWriter = require('csv-writer').createObjectCsvWriter;
            
            const tasks = [];
            
            // Read current tasks
            await new Promise((resolve, reject) => {
                fs.createReadStream(CSV_FILE_PATH)
                    .pipe(csv())
                    .on('data', (row) => {
                        tasks.push(row);
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            
            console.log(`📋 Found ${tasks.length} tasks to reset`);
            
            // Reset all tasks
            const resetTasks = tasks.map(task => ({
                'Task Name': task['Task Name'],
                'Description': task['Description'],
                'Execution Time': task['Execution Time'],
                'Status': 'Pending',
                'Response Time': '',
                'Responded By': '',
                '': task[''] || '',
                'TaskID': task['TaskID']
            }));
            
            // Write back to CSV
            const csvWriter = createCsvWriter({
                path: CSV_FILE_PATH,
                header: [
                    { id: 'Task Name', title: 'Task Name' },
                    { id: 'Description', title: 'Description' },
                    { id: 'Execution Time', title: 'Execution Time' },
                    { id: 'Status', title: 'Status' },
                    { id: 'Response Time', title: 'Response Time' },
                    { id: 'Responded By', title: 'Responded By' },
                    { id: '', title: '' },
                    { id: 'TaskID', title: 'TaskID' }
                ]
            });
            
            await csvWriter.writeRecords(resetTasks);
            
            // Clear pending responses
            this.pendingResponses.clear();
            
            const successMessage = `✅ *Daily Reset Completed Successfully!*\n\n📊 *Summary:*\n• ${tasks.length} tasks reset to "Pending"\n• Response times cleared\n• Responded by fields cleared\n• Pending responses cleared\n\n🔄 All tasks are now ready for the new day!`;
            
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, successMessage, { parse_mode: "Markdown" });
            console.log(`✅ Daily reset completed successfully. ${tasks.length} tasks reset.`);
            
        } catch (error) {
            console.error(`❌ Error handling daily reset command: ${error.message}`);
            await this.bot.sendMessage(TELEGRAM_CHAT_ID, 
                '❌ *Error during daily reset*\n\nPlease try again later.',
                { parse_mode: "Markdown" }
            );
        }
    }
}

module.exports = TelegramBotManager;

const TaskScheduler = require('./src/taskScheduler');
const TelegramBotManager = require('./src/telegramBot');
const CSVManager = require('./src/csvManager');
const { TaskStatus, TIMEOUT_SETTINGS } = require('./src/config');

class FollowUpTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
        this.taskScheduler = new TaskScheduler(this.telegramBot);
    }

    async runTest() {
        console.log('📢 Starting Follow-up Test...');
        console.log('');

        // Test 1: Check current awaiting tasks
        console.log('🔄 Test 1: Checking current tasks awaiting response...');
        const awaitingTasks = await CSVManager.getTasksByStatus(TaskStatus.SENT_AND_AWAITING_RESPONSE);
        console.log(`Found ${awaitingTasks.length} tasks with SENT_AND_AWAITING_RESPONSE status`);
        
        if (awaitingTasks.length > 0) {
            awaitingTasks.forEach(task => {
                const responseTime = task["Response Time"];
                const timeDiff = responseTime ? this.calculateTimeDiff(responseTime) : 'N/A';
                console.log(`  - ${task["TaskID"]}: ${task["Task Name"]} (Response Time: ${responseTime}, Time Diff: ${timeDiff} minutes)`);
            });
        }
        console.log('');

        // Test 2: Run follow-up check
        console.log('🔄 Test 2: Running follow-up check...');
        await this.taskScheduler.checkFollowUpTasks();
        console.log('');

        // Test 3: Check timeout settings
        console.log('🔄 Test 3: Follow-up settings...');
        console.log(`Response timeout: ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes`);
        console.log(`Follow-up threshold: 20 minutes`);
        console.log(`Follow-up window: 20 to ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes`);
        console.log('');

        // Test 4: Show task status distribution
        console.log('🔄 Test 4: Current task status distribution...');
        const allStatuses = [TaskStatus.PENDING, TaskStatus.SENT_AND_AWAITING_RESPONSE, TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXPIRED];
        
        for (const status of allStatuses) {
            const tasks = await CSVManager.getTasksByStatus(status);
            console.log(`  ${status}: ${tasks.length} tasks`);
        }
        console.log('');

        console.log('✅ Follow-up test completed!');
        console.log('');
        console.log('💡 Manual testing:');
        console.log('• Follow-up checks run automatically every 5 minutes');
        console.log('• Tasks with SENT_AND_AWAITING_RESPONSE status are checked');
        console.log('• Follow-up is sent if task has been waiting 20+ minutes but < timeout');
        console.log('• Follow-up includes remaining time and response format reminder');
    }

    calculateTimeDiff(responseTime) {
        try {
            const responseDateTime = new Date(responseTime);
            const now = new Date();
            const timeDiffMinutes = (now.getTime() - responseDateTime.getTime()) / (1000 * 60);
            return timeDiffMinutes.toFixed(1);
        } catch (error) {
            return 'Invalid';
        }
    }
}

// Run the test
if (require.main === module) {
    const testInstance = new FollowUpTest();
    testInstance.runTest().then(() => {
        console.log('🛑 Test completed, shutting down...');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = FollowUpTest;


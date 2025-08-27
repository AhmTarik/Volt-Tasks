const TaskScheduler = require('./src/taskScheduler');
const TelegramBotManager = require('./src/telegramBot');
const CSVManager = require('./src/csvManager');
const { TaskStatus, TIMEOUT_SETTINGS } = require('./src/config');

class ExpiredResponsesTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
        this.taskScheduler = new TaskScheduler(this.telegramBot);
    }

    async runTest() {
        console.log('⏰ Starting Expired Responses Test...');
        console.log('');

        // Test 1: Check current awaiting tasks
        console.log('🔄 Test 1: Checking current tasks awaiting response...');
        const awaitingTasks = await CSVManager.getTasksByStatus(TaskStatus.SENT_AND_AWAITING_RESPONSE);
        console.log(`Found ${awaitingTasks.length} tasks with SENT_AND_AWAITING_RESPONSE status`);
        
        if (awaitingTasks.length > 0) {
            awaitingTasks.forEach(task => {
                console.log(`  - ${task["TaskID"]}: ${task["Task Name"]} (Response Time: ${task["Response Time"] || 'N/A'})`);
            });
        }
        console.log('');

        // Test 2: Run expired responses check
        console.log('🔄 Test 2: Running expired responses check...');
        await this.taskScheduler.checkExpiredResponses();
        console.log('');

        // Test 3: Check timeout settings
        console.log('🔄 Test 3: Current timeout settings...');
        console.log(`Response timeout: ${TIMEOUT_SETTINGS.RESPONSE_TIMEOUT} minutes`);
        console.log(`Expired check interval: ${TIMEOUT_SETTINGS.EXPIRED_CHECK_INTERVAL} minutes`);
        console.log('');

        // Test 4: Show task status distribution
        console.log('🔄 Test 4: Current task status distribution...');
        const allStatuses = [TaskStatus.PENDING, TaskStatus.SENT_AND_AWAITING_RESPONSE, TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.EXPIRED];
        
        for (const status of allStatuses) {
            const tasks = await CSVManager.getTasksByStatus(status);
            console.log(`  ${status}: ${tasks.length} tasks`);
        }
        console.log('');

        console.log('✅ Expired responses test completed!');
        console.log('');
        console.log('💡 Manual testing:');
        console.log('• The expired check runs automatically every 10 minutes');
        console.log('• Tasks with SENT_AND_AWAITING_RESPONSE status are checked');
        console.log('• If response time + timeout > current time, status becomes EXPIRED');
        console.log('• Telegram notification is sent when tasks expire');
    }
}

// Run the test
if (require.main === module) {
    const testInstance = new ExpiredResponsesTest();
    testInstance.runTest().then(() => {
        console.log('🛑 Test completed, shutting down...');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = ExpiredResponsesTest;


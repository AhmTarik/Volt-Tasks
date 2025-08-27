const TelegramBotManager = require('./src/telegramBot');

class TasksStatusTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
    }

    async runTest() {
        console.log('📊 Starting Tasks Status Test...');
        
        try {
            console.log('📤 Testing tasks status functionality...');
            
            // Test the sendTasksStatus method
            await this.telegramBot.sendTasksStatus();
            
            console.log('');
            console.log('✅ Tasks status test completed!');
            console.log('💡 You can also test by sending "tasks-status" in the Telegram group');
            console.log('⏰ The bot will automatically send status every hour');
            
            // Keep the bot running for 2 minutes to test manual status command
            setTimeout(() => {
                console.log('⏰ Test completed. Stopping bot...');
                this.stop();
            }, 120000); // 2 minutes

        } catch (error) {
            console.error('❌ Test failed:', error.message);
            this.stop();
        }
    }

    stop() {
        if (this.telegramBot) {
            this.telegramBot.stop();
        }
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    if (global.testInstance) {
        global.testInstance.stop();
    }
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    if (global.testInstance) {
        global.testInstance.stop();
    }
});

// Run the test
if (require.main === module) {
    const testInstance = new TasksStatusTest();
    global.testInstance = testInstance;
    testInstance.runTest();
}

module.exports = TasksStatusTest;


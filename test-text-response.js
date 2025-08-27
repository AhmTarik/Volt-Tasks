const TelegramBotManager = require('./src/telegramBot');

class TextResponseTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
    }

    async runTest() {
        console.log('🧪 Starting Text Response Test...');
        
        try {
            // Send a test task message
            const testTask = {
                "TaskID": "TEXT-TEST-001",
                "Task Name": "اختبار الرد النصي",
                "Description": "هذا اختبار للرد النصي الجديد\n\nيجب أن يعمل مع التنسيق: TEXT-TEST-001: الإجابة",
                "Execution Time": "الآن",
                "Status": "Pending"
            };

            await this.telegramBot.sendTaskMessage(testTask);
            
            console.log('✅ Test task sent!');
            console.log('📝 Now try sending a message in the format:');
            console.log('   Task-TEXT-TEST-001: yes');
            console.log('   or');
            console.log('   Task-TEXT-TEST-001: no');
            
            // Keep the bot running for 2 minutes to test
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
    const testInstance = new TextResponseTest();
    global.testInstance = testInstance;
    testInstance.runTest();
}

module.exports = TextResponseTest;

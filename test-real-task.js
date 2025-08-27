const TelegramBotManager = require('./src/telegramBot');

class RealTaskTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
    }

    async runTest() {
        console.log('🧪 Starting Real Task Test...');
        
        try {
            // Send a real task from the CSV
            const realTask = {
                "TaskID": "TASK-001",
                "Task Name": "اطفاء نور اليافطه",
                "Description": "الرجاء باطفاء نور اليافطه من لوحه مفاتيح الكهرباء",
                "Execution Time": "0:10",
                "Status": "Pending"
            };

            await this.telegramBot.sendTaskMessage(realTask);
            
            console.log('✅ Real task sent!');
            console.log('📝 Now try sending a message in the format:');
            console.log('   Task-TASK-001: yes');
            console.log('   or');
            console.log('   Task-TASK-001: no');
            console.log('');
            console.log('📋 Task Details:');
            console.log(`   ID: ${realTask.TaskID}`);
            console.log(`   Name: ${realTask["Task Name"]}`);
            console.log(`   Description: ${realTask.Description}`);
            console.log(`   Execution Time: ${realTask["Execution Time"]}`);
            
            // Keep the bot running for 3 minutes to test
            setTimeout(() => {
                console.log('⏰ Test completed. Stopping bot...');
                this.stop();
            }, 180000); // 3 minutes

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
    const testInstance = new RealTaskTest();
    global.testInstance = testInstance;
    testInstance.runTest();
}

module.exports = RealTaskTest;


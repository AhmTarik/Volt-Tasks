const TelegramBotManager = require('./src/telegramBot');

class ClearMessagesTest {
    constructor() {
        this.telegramBot = new TelegramBotManager();
    }

    async runTest() {
        console.log('🧹 Starting Clear Messages Test...');
        
        try {
            // Send some test messages first
            console.log('📤 Sending test messages...');
            
            const testMessages = [
                '🧪 Test message 1',
                '🧪 Test message 2', 
                '🧪 Test message 3',
                '🧪 Test message 4',
                '🧪 Test message 5'
            ];

            for (const testMessage of testMessages) {
                await this.telegramBot.bot.sendMessage(process.env.TELEGRAM_CHAT_ID, testMessage);
                console.log(`✅ Sent: ${testMessage}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between messages
            }

            console.log('');
            console.log('⏳ Waiting 3 seconds before clearing...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Test the clear functionality
            console.log('🧹 Testing clear functionality...');
            await this.telegramBot.clearAllMessages();

            console.log('');
            console.log('✅ Clear messages test completed!');
            console.log('💡 You can also test by sending "tarik-clear-all" in the Telegram group');
            
            // Keep the bot running for 2 minutes to test manual clear command
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
    const testInstance = new ClearMessagesTest();
    global.testInstance = testInstance;
    testInstance.runTest();
}

module.exports = ClearMessagesTest;

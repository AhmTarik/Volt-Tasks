const TelegramBotManager = require('./telegramBot');

class TestBot {
    constructor() {
        this.telegramBot = new TelegramBotManager();
    }

    /**
     * Run a quick test
     */
    async runTest() {
        try {
            console.log('🧪 Starting Quick Test...');
            
            // Send a test message
            await this.telegramBot.sendTestMessage('TEST-QUICK', 'Quick Test');
            
            console.log('✅ Test message sent!');
            console.log('📱 Check your Telegram chat for the test message');
            console.log('🔘 Click the Yes or No button to test functionality');
            console.log('⏰ Bot will stay running for 60 seconds...');
            
            // Keep running for 60 seconds
            setTimeout(() => {
                console.log('✅ Test completed!');
                this.stop();
            }, 60000);
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            this.stop();
        }
    }

    /**
     * Stop the test bot
     */
    stop() {
        if (this.telegramBot) {
            this.telegramBot.stop();
        }
        console.log('🛑 Test bot stopped');
        process.exit(0);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    const testBot = new TestBot();
    testBot.runTest();
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Test interrupted');
        testBot.stop();
    });
}

module.exports = TestBot;




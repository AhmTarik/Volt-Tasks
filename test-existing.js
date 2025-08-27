const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('🧪 Testing Button Click Reception');
console.log('📱 This will test if the bot can receive button clicks');
console.log('💡 Click any existing button in your Telegram chat');

// Initialize bot with polling
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Handle callback queries (button clicks)
bot.on('callback_query', async (callbackQuery) => {
    console.log('\n🔔 === BUTTON CLICKED! ===');
    console.log(`📋 Callback data: ${callbackQuery.data}`);
    console.log(`👤 User: ${callbackQuery.from.username || callbackQuery.from.first_name}`);
    console.log(`💬 Message ID: ${callbackQuery.message.message_id}`);
    
    const { data, from } = callbackQuery;
    const [response, taskID] = data.split('_');
    
    try {
        // Answer the callback query
        const notificationText = response === 'yes' 
            ? 'تم تأكيد إنجاز المهمة ✅' 
            : 'تم تسجيل عدم إنجاز المهمة ❌';
        await bot.answerCallbackQuery(callbackQuery.id, { text: notificationText });
        console.log(`✅ Notification sent: ${notificationText}`);
        
        // Update the message
        const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
        const updatedMessage = `🧪 *BUTTON TEST*\n\n📋 *${taskID} - Button Test*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n⏰ ${new Date().toLocaleString()}\n\n🎉 Button click received successfully!`;
        
        await bot.editMessageText(updatedMessage, {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: callbackQuery.message.message_id,
            parse_mode: "Markdown"
        });
        
        console.log(`✅ Message updated successfully!`);
        console.log(`📊 Status: ${response === 'yes' ? 'COMPLETED' : 'FAILED'}`);
        console.log(`🎉 Test completed!`);
        
        // Stop the bot after successful test
        setTimeout(() => {
            console.log('🛑 Stopping test bot...');
            bot.stopPolling();
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'حدث خطأ في معالجة الرد'
        });
    }
});

// Error handling
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

console.log('🤖 Bot is listening for button clicks...');
console.log('⏰ Click any existing button in your Telegram chat');
console.log('💡 Press Ctrl+C to stop the test');




const TelegramBot = require("node-telegram-bot-api");
require("dotenv").config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

console.log('🔧 Testing Bot Permissions');
console.log('📱 This will test if the bot can send and edit messages');

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
        
        // Try to update the message
        const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
        const updatedMessage = `🔧 *PERMISSION TEST*\n\n📋 *${taskID} - Permission Test*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n⏰ ${new Date().toLocaleString()}\n\n🎉 Permission test successful!`;
        
        await bot.editMessageText(updatedMessage, {
            chat_id: TELEGRAM_CHAT_ID,
            message_id: callbackQuery.message.message_id,
            parse_mode: "Markdown"
        });
        
        console.log(`✅ Message updated successfully!`);
        console.log(`📊 Status: ${response === 'yes' ? 'COMPLETED' : 'FAILED'}`);
        console.log(`🎉 Permission test passed!`);
        
        // Stop the bot after successful test
        setTimeout(() => {
            console.log('🛑 Stopping test bot...');
            bot.stopPolling();
            process.exit(0);
        }, 2000);
        
    } catch (error) {
        console.error(`❌ Error updating message: ${error.message}`);
        console.log('🔧 This indicates a permission issue');
        console.log('💡 Make sure the bot has "Edit messages" permission');
        
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'حدث خطأ في تحديث الرسالة - مشكلة في الصلاحيات'
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

// Send test message
async function sendTestMessage() {
    const message = `🔧 *PERMISSION TEST*\n\n📋 *PERM-001 - Test Permissions*\n\nThis is a test to check if the bot can edit messages\n\n🕒 ${new Date().toLocaleTimeString()}\n\nهل تم إنجاز هذه المهمة؟`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: "✅ Yes PERM-001", callback_data: 'yes_PERM-001' },
                { text: "❌ No PERM-001", callback_data: 'no_PERM-001' }
            ]
        ]
    };

    try {
        const sentMessage = await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
        
        console.log(`✅ Test message sent! Message ID: ${sentMessage.message_id}`);
        console.log(`📱 Check your Telegram chat for the test message`);
        console.log(`🔘 Click the Yes or No button to test permissions`);
        console.log(`⏰ Bot is listening for button clicks...`);
        
    } catch (error) {
        console.error(`❌ Failed to send message: ${error.message}`);
        console.log('🔧 This indicates a permission issue');
        console.log('💡 Make sure the bot has "Send messages" permission');
        process.exit(1);
    }
}

// Start the test
setTimeout(sendTestMessage, 1000);




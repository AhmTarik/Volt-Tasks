require("dotenv").config();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const { parse } = require("json2csv");
const TelegramBot = require("node-telegram-bot-api");

// Load environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// CSV file path
const CSV_FILE_PATH = path.join(__dirname, "tasks.csv");

// Task status constants
const TaskStatus = {
  PENDING: 'Pending',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
  SENT_AND_AWAITING_RESPONSE: 'SentAndAwaitingResponse',
  COMPLETED: 'Completed',
};

// Store pending responses
const pendingResponses = new Map();

// Initialize bot with polling enabled
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Function to send test message with yes/no buttons
async function sendTestMessage() {
    const testTask = {
        "TaskID": "TEST-001",
        "Task Name": "Test Task",
        "Description": "This is a test task to verify the bot functionality",
        "Execution Time": new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    };

    const message = `🧪 *TEST MESSAGE*\n\n📋 *${testTask["TaskID"]} - ${testTask["Task Name"]}*\n\n${testTask["Description"]}\n\n🕒 ${testTask["Execution Time"]}\n\nهل تم إنجاز هذه المهمة؟`;
    
    const keyboard = {
        inline_keyboard: [
            [
                { text: `✅ Yes ${testTask["TaskID"]}`, callback_data: `yes_${testTask["TaskID"]}` },
                { text: `❌ No ${testTask["TaskID"]}`, callback_data: `no_${testTask["TaskID"]}` }
            ]
        ]
    };

    try {
        const sentMessage = await bot.sendMessage(TELEGRAM_CHAT_ID, message, { 
            parse_mode: "Markdown",
            reply_markup: keyboard
        });
        
        // Store the pending response
        const responseKey = testTask["TaskID"];
        pendingResponses.set(responseKey, {
            messageId: sentMessage.message_id,
            timestamp: Date.now(),
            taskID: testTask["TaskID"],
            taskName: testTask["Task Name"],
            executionTime: testTask["Execution Time"]
        });
        
        console.log(`✅ Test message sent successfully!`);
        console.log(`📱 Check your Telegram chat for the test message`);
        console.log(`⏰ You have 60 seconds to respond before it expires`);
        console.log(`🔄 Bot is listening for button clicks...`);
        
        return sentMessage;
    } catch (error) {
        console.error(`❌ Failed to send test message: ${error.message}`);
        throw error;
    }
}

// Function to handle callback queries (button responses)
bot.on('callback_query', async (callbackQuery) => {
    console.log(`🔔 Callback query received!`);
    console.log(`📋 Callback data: ${callbackQuery.data}`);
    console.log(`👤 From user: ${callbackQuery.from.username || callbackQuery.from.first_name}`);
    
    const { data, from } = callbackQuery;
    const [response, taskID] = data.split('_');
    
    try {
        console.log(`✅ Response received: ${response} for task ${taskID} from ${from.username || from.first_name}`);
        
        // Check if task is still pending response
        if (!pendingResponses.has(taskID)) {
            console.log(`⚠️ Task ${taskID} is no longer pending response`);
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: 'هذه المهمة لم تعد تنتظر رداً'
            });
            return;
        }
        
        // Remove from pending responses
        pendingResponses.delete(taskID);
        
        // Answer the callback query
        const notificationText = response === 'yes' 
            ? 'تم تأكيد إنجاز المهمة ✅' 
            : 'تم تسجيل عدم إنجاز المهمة ❌';
        await bot.answerCallbackQuery(callbackQuery.id, { text: notificationText });
        
        // Update the message to show the response
        const responseText = response === 'yes' ? '✅ تم الإنجاز' : '❌ لم يتم الإنجاز';
        await bot.editMessageText(
            `🧪 *TEST MESSAGE*\n\n📋 *${taskID} - Test Task*\n\n${responseText}\n\n👤 الرد من: ${from.username || from.first_name}\n\n✅ Test completed successfully!`,
            {
                chat_id: TELEGRAM_CHAT_ID,
                message_id: callbackQuery.message.message_id,
                parse_mode: "Markdown"
            }
        );
        
        console.log(`✅ Test completed successfully!`);
        console.log(`📊 Status would be: ${response === 'yes' ? 'COMPLETED' : 'FAILED'}`);
        
        // Keep bot running for a bit longer to show completion
        setTimeout(() => {
            console.log(`🛑 Stopping test bot...`);
            process.exit(0);
        }, 3000);
        
    } catch (error) {
        console.error(`❌ Error handling callback query: ${error.message}`);
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: 'حدث خطأ في معالجة الرد'
        });
    }
});

// Function to check for expired responses (for testing)
function checkExpiredResponses() {
    const now = Date.now();
    const timeoutMs = 60 * 1000; // 60 seconds for testing
    
    for (const [key, response] of pendingResponses.entries()) {
        if (now - response.timestamp > timeoutMs) {
            console.log(`⏰ Test response expired`);
            
            // Update the message to show expired status
            bot.editMessageText(
                `🧪 *TEST MESSAGE*\n\n📋 *${response.taskID} - ${response.taskName}*\n\n⏰ انتهت مهلة الرد\n\nالحالة: منتهية الصلاحية\n\n✅ Test completed - timeout scenario!`,
                {
                    chat_id: TELEGRAM_CHAT_ID,
                    message_id: response.messageId,
                    parse_mode: "Markdown"
                }
            ).catch(err => console.error(`❌ Failed to update expired message: ${err.message}`));
            
            // Remove from pending responses
            pendingResponses.delete(key);
            
            console.log(`✅ Test completed - timeout scenario!`);
            console.log(`📊 Status would be: EXPIRED`);
            
            // Stop the bot after timeout test
            setTimeout(() => {
                console.log(`🛑 Stopping test bot...`);
                process.exit(0);
            }, 3000);
        }
    }
}

// Error handling for bot
bot.on('error', (error) => {
    console.error('❌ Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error);
});

// Start the test
console.log('🧪 Starting Telegram bot test...');
console.log('📱 Sending test message...');

// Send test message after a short delay
setTimeout(async () => {
    try {
        await sendTestMessage();
        
        // Check for expired responses every 10 seconds
        setInterval(checkExpiredResponses, 10000);
        
        console.log(`⏰ Bot will stay running for 60 seconds or until you click a button`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}, 1000);

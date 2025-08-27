# Volt Tasks - Telegram Bot

A Telegram bot that sends task notifications to a group and tracks member responses using a text-based format.

## 🚀 Features

- **Text-based Responses**: Members respond using the format `TaskID: answer`
- **Automatic Status Updates**: Updates CSV file based on responses
- **Timeout Handling**: Automatically marks tasks as expired after 30 minutes
- **Flexible Answer Format**: Supports multiple languages and formats
- **Real-time Tracking**: Monitors pending responses and provides status updates

## 📋 Task Response Format

Members can respond to tasks using the following format:

```
Task-{{taskID}}: {{answer}}
```

Where:
- `{{taskID}}` is the task ID from the CSV file
- `{{answer}}` is either `yes` or `no` only

### Supported Answer Formats:

**For Completed Tasks:**
- `Task-TASK-001: yes`

**For Failed Tasks:**
- `Task-TASK-002: no`

### Examples:
```
Task-TASK-001: yes
Task-TASK-002: no
Task-TASK-003: yes
Task-TASK-004: no
```

## 🧹 Clear Messages

The bot can clear all messages from the group using the command:

```
tarik-clear-all
```

### Features:
- ✅ **Clears all recent messages** (up to 100 messages)
- ✅ **Batch processing** to avoid rate limits
- ✅ **Confirmation messages** with status updates
- ✅ **Automatic cleanup** of confirmation messages

### Usage:
1. Type `tarik-clear-all` in the Telegram group
2. Bot will show "Clearing all messages..." confirmation
3. Messages are deleted in batches
4. Success confirmation appears
5. Confirmation message auto-deletes after 5 seconds

## 📊 Tasks Status

The bot can display a comprehensive status of all tasks from the beginning of the day.

### Automatic Status:
- ✅ **Hourly reports** - Sent automatically every hour
- ✅ **Daily summary** - Shows all tasks from today
- ✅ **Status breakdown** - Grouped by completion status
- ✅ **Response tracking** - Shows who responded and when

### Manual Status:
Type this command in the Telegram group:
```
tasks-status
```

### Status Format:
```
📊 Daily Tasks Status

📅 8/18/2025
⏰ 12:30:45 PM

Completed (3):
• Completed - TASK-001 - اطفاء نور اليافطه - username - 8/18/2025, 10:15:30 AM
• Completed - TASK-002 - مرور علي الاجهزه - username - 8/18/2025, 11:20:15 AM

Failed (1):
• Failed - TASK-003 - مرور نظافه - username - 8/18/2025, 9:45:22 AM

Pending (2):
• Pending - TASK-004 - تسليم شيفت - N/A - N/A

📈 Summary:
• Total: 6
• Completed: 3
• Failed: 1
• Pending: 2
• Expired: 0
```

## 🔧 Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Volt-Tasks
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

## 📁 Project Structure

```
Volt-Tasks/
├── src/
│   ├── config.js          # Configuration and constants
│   ├── csvManager.js      # CSV file operations
│   ├── telegramBot.js     # Telegram bot logic
│   ├── taskScheduler.js   # Task scheduling
│   └── app.js            # Main application
├── tasks.csv             # Task data
├── app.js               # Entry point
├── start-bot.sh         # Bot management script
└── package.json
```

## 🚀 Usage

### Starting the Bot

**Using the shell script (Recommended):**
```bash
# Start the main bot
./start-bot.sh start

# Start in development mode
./start-bot.sh dev

# Test the text-based response system
./start-bot.sh test-text

# Stop all bot processes
./start-bot.sh kill

# Check bot status
./start-bot.sh status
```

**Using npm scripts:**
```bash
# Start the bot
npm start

# Start with clean process kill
npm run start-clean

# Test text-based responses
npm run test-text

# Kill all bot processes
npm run kill-bots
```

### Testing

**Test the text-based response system:**
```bash
npm run test-text
```

This will send a test task and wait for responses in the format:
```
Task-TEXT-TEST-001: yes
```

**Test the clear messages functionality:**
```bash
npm run test-clear
```

This will send test messages and then clear them automatically.

**Test the tasks status functionality:**
```bash
npm run test-status
```

This will send a tasks status report to the group.

## 📊 Task Status Flow

```
Pending → SentAndAwaitingResponse → [User Response] → Completed/Failed
                                    ↓
                                 [Timeout] → Expired
```

### Status Types:
- **Pending**: Task ready to be sent
- **SentAndAwaitingResponse**: Task sent, waiting for response
- **Completed**: Task completed successfully
- **Failed**: Task not completed
- **Expired**: No response received within timeout

## 📝 CSV File Format

The `tasks.csv` file should contain the following columns:

```csv
TaskID,Task Name,Description,Execution Time,Status,RespondedBy,ResponseTime
TASK-001,Task Name,Task Description,9:00 AM,Pending,,
```

## 🔍 Monitoring

The bot provides real-time monitoring:

- **Task Check Interval**: Every 10 minutes
- **Expired Response Check**: Every 5 minutes  
- **Status Display**: Every 15 minutes
- **Response Timeout**: 30 minutes

## ⏰ Task Timing System

The bot now includes intelligent task timing to prevent unnecessary message sending:

### **Smart Task Sending:**
- ✅ **Only sends tasks when execution time is reached**
- ✅ **Respects the "Execution Time" field in CSV**
- ✅ **Prevents duplicate message sending**
- ✅ **Provides detailed timing logs**

### **Execution Time Logic:**
- **Tasks with execution time**: Only sent when current time ≥ execution time
- **Tasks without execution time**: Sent immediately when status is "Pending"
- **Non-pending tasks**: Never sent regardless of time

### **Example:**
```
Current time: 14:30
Task TASK-001: Execution Time "14:00" → ✅ READY (sent)
Task TASK-002: Execution Time "15:00" → ⏳ NOT READY (waiting)
Task TASK-003: Execution Time "" → ✅ READY (sent immediately)
Task TASK-004: Status "Completed" → ❌ NOT SENT (wrong status)
```

### **Testing Timing:**
```bash
npm run test-timing
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"409 Conflict" Error:**
   ```bash
   npm run kill-bots
   npm run start-clean
   ```

2. **"429 Too Many Requests" Error:**
   - Wait for the specified retry time
   - Reduce message frequency

3. **Bot Not Responding:**
   - Check bot permissions in Telegram
   - Ensure bot is added to the group
   - Verify environment variables

4. **Wrong Response Format:**
   - The bot will automatically send a help message
   - Use the format: `Task-{{taskID}}: {{answer}}`

### Bot Permissions:

For groups, ensure the bot has these permissions:
- ✅ Send messages
- ✅ Edit messages  
- ✅ Delete messages
- ✅ Pin messages

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the console logs
3. Test with `npm run test-text`

## 🔄 Recent Updates

- **v2.0**: Switched from button-based to text-based responses
- **v1.0**: Initial button-based implementation
require("dotenv").config();
const path = require('path');

// Telegram configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// CSV file path
const CSV_FILE_PATH = path.join(__dirname, "..", "tasks.csv");

// Task status constants
const TaskStatus = {
    PENDING: 'Pending',
    FAILED: 'Failed',
    EXPIRED: 'Expired',
    SENT_AND_AWAITING_RESPONSE: 'SentAndAwaitingResponse',
    COMPLETED: 'Completed',
};

// Timeout settings
const TIMEOUT_SETTINGS = {
    RESPONSE_TIMEOUT: 60, // minutes
};

// Rate limiting settings
const RATE_LIMIT_SETTINGS = {
    DELAY_BETWEEN_MESSAGES: 2000, // 2 seconds in milliseconds
    MAX_RETRIES: 3,
    RETRY_DELAY: 5000, // 5 seconds in milliseconds
};

module.exports = {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    CSV_FILE_PATH,
    TaskStatus,
    TIMEOUT_SETTINGS,
    RATE_LIMIT_SETTINGS,
};

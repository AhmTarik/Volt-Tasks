const TelegramBotManager = require('./telegramBot');
const TaskScheduler = require('./taskScheduler');

class VoltTasksApp {
    constructor() {
        this.telegramBot = new TelegramBotManager();
        this.taskScheduler = new TaskScheduler(this.telegramBot);
    }

    /**
     * Start the application
     */
    start() {
        try {
            console.log('🚀 Starting Volt Tasks Bot...');
            
            // Start the task scheduler
            this.taskScheduler.start();
            
            console.log('✅ Application started successfully');
            
            // Handle graceful shutdown
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Failed to start application:', error.message);
            process.exit(1);
        }
    }

    /**
     * Stop the application
     */
    stop() {
        console.log('🛑 Stopping Volt Tasks Bot...');
        
        if (this.taskScheduler) {
            this.taskScheduler.stop();
        }
        
        if (this.telegramBot) {
            this.telegramBot.stop();
        }
        
        console.log('✅ Application stopped');
        process.exit(0);
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        // Handle SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            console.log('\n🛑 Received SIGINT, shutting down gracefully...');
            this.stop();
        });

        // Handle SIGTERM
        process.on('SIGTERM', () => {
            console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
            this.stop();
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('❌ Uncaught Exception:', error);
            this.stop();
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
            this.stop();
        });
    }
}

// Start the application if this file is run directly
if (require.main === module) {
    const app = new VoltTasksApp();
    app.start();
}

module.exports = VoltTasksApp;




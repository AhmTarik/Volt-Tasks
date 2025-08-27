#!/bin/bash

# Volt Tasks Bot Manager
# This script kills any existing bot processes and starts the main application

echo "🤖 Volt Tasks Bot Manager"
echo "=========================="

# Function to kill bot processes
kill_bots() {
    echo "🛑 Stopping any running bot processes..."
    
    # Kill processes containing 'bot' in the command
    pkill -f "node.*bot" 2>/dev/null || true
    
    # Kill processes containing 'app.js' in the command
    pkill -f "node.*app.js" 2>/dev/null || true
    
    # Kill processes containing 'test' in the command
    pkill -f "node.*test" 2>/dev/null || true
    
    # Wait a moment for processes to terminate
    sleep 2
    
    # Check if any bot processes are still running
    if pgrep -f "node.*bot\|node.*app.js\|node.*test" > /dev/null; then
        echo "⚠️  Some processes may still be running. Force killing..."
        pkill -9 -f "node.*bot\|node.*app.js\|node.*test" 2>/dev/null || true
        sleep 1
    fi
    
    echo "✅ Bot processes stopped"
}

# Function to start the main bot
start_main_bot() {
    echo "🚀 Starting main bot application..."
    echo "📱 Bot will check for tasks every 10 minutes"
    echo "⏰ Response timeout: 30 minutes"
    echo "💡 Press Ctrl+C to stop the bot"
    echo ""
    
    node app.js
}

# Function to start in development mode
start_dev_bot() {
    echo "🔧 Starting bot in development mode..."
    echo "📱 Bot will restart automatically on file changes"
    echo "💡 Press Ctrl+C to stop the bot"
    echo ""
    
    nodemon app.js
}

# Function to run a simple test
run_simple_test() {
    echo "🧪 Running simple button test..."
    echo "📱 This will send one test message and wait for button clicks"
    echo "💡 Press Ctrl+C to stop the test"
    echo ""
    
    node simple-test.js
}

# Function to run debug test
run_debug_test() {
    echo "🔍 Running debug test..."
    echo "📱 This will test bot connection and send test messages"
    echo ""
    
    node debug-bot.js
}

# Function to run text-based response test
run_text_test() {
    echo "📝 Running text-based response test..."
    echo "📱 This will send a test task and wait for text responses"
    echo "💬 Try responding with: Task-TEXT-TEST-001: yes"
    echo "💡 Press Ctrl+C to stop the test"
    echo ""
    
    node test-text-response.js
}

# Main script logic
case "${1:-start}" in
    "start"|"main")
        kill_bots
        start_main_bot
        ;;
    "dev"|"development")
        kill_bots
        start_dev_bot
        ;;
    "test"|"simple")
        kill_bots
        run_simple_test
        ;;
    "test-text")
        kill_bots
        run_text_test
        ;;
    "debug")
        kill_bots
        run_debug_test
        ;;
    "kill"|"stop")
        kill_bots
        echo "✅ All bot processes stopped"
        ;;
    "status")
        echo "📊 Current bot processes:"
        ps aux | grep -E "node.*(bot|app\.js|test)" | grep -v grep || echo "   No bot processes running"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: ./start-bot.sh [command]"
        echo ""
        echo "Commands:"
        echo "  start, main     - Start the main bot application"
        echo "  dev, development - Start in development mode with auto-restart"
        echo "  test, simple    - Run simple button test"
        echo "  test-text       - Run text-based response test"
        echo "  debug           - Run debug connection test"
        echo "  kill, stop      - Stop all bot processes"
        echo "  status          - Show current bot processes"
        echo "  help            - Show this help message"
        echo ""
        echo "Examples:"
        echo "  ./start-bot.sh start     # Start main bot"
        echo "  ./start-bot.sh dev       # Start in development mode"
        echo "  ./start-bot.sh test-text # Test text-based responses"
        echo "  ./start-bot.sh kill      # Stop all bots"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "💡 Use './start-bot.sh help' for available commands"
        exit 1
        ;;
esac



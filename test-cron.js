const cron = require('node-cron');

class CronTest {
    constructor() {
        this.testJobs = [];
    }

    runTest() {
        console.log('⏰ Starting Cron Test...');
        console.log('');

        // Test 1: Basic cron validation
        console.log('🔄 Test 1: Cron expression validation...');
        const testExpressions = [
            '*/5 * * * *',    // Every 5 minutes
            '0 * * * *',      // Every hour at minute 0
            '55 23 * * *',    // Every day at 11:55 PM
            '*/10 * * * *',   // Every 10 minutes
            '30 2 * * *',     // Every day at 2:30 AM
            '0 0 * * 0'       // Every Sunday at midnight
        ];

        testExpressions.forEach(expr => {
            const isValid = cron.validate(expr);
            console.log(`   ${expr} → ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        });

        console.log('');

        // Test 2: Schedule a test job
        console.log('📅 Test 2: Scheduling a test job (runs in 10 seconds)...');
        const testJob = cron.schedule('*/10 * * * * *', () => {
            console.log('   🎯 Test job executed at:', new Date().toLocaleString());
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        this.testJobs.push(testJob);
        console.log('   Test job scheduled successfully');

        // Test 3: Show next run times
        console.log('');
        console.log('⏰ Test 3: Next run times for common schedules...');
        this.showNextRunTimes();

        console.log('');
        console.log('✅ Cron test completed!');
        console.log('');
        console.log('💡 Manual testing:');
        console.log('• Send "schedule-info" in Telegram to see current schedule');
        console.log('• Send "archive-tasks" to manually trigger backup');
        console.log('• Cron jobs will run automatically based on schedule');

        // Stop test job after 30 seconds
        setTimeout(() => {
            console.log('');
            console.log('🛑 Stopping test job...');
            this.testJobs.forEach(job => job.stop());
            console.log('✅ Test job stopped');
            process.exit(0);
        }, 30000);
    }

    showNextRunTimes() {
        const now = new Date();
        const schedules = [
            { name: 'Task Checks (every 5 min)', expr: '*/5 * * * *' },
            { name: 'Hourly Status (every hour)', expr: '0 * * * *' },
            { name: 'Daily Archive (11:55 PM)', expr: '55 23 * * *' },
            { name: 'Expired Checks (every 10 min)', expr: '*/10 * * * *' }
        ];

        schedules.forEach(schedule => {
            const nextRun = this.getNextRunTime(schedule.expr, now);
            console.log(`   ${schedule.name}: ${nextRun.toLocaleString()}`);
        });
    }

    getNextRunTime(cronExpr, fromDate = new Date()) {
        const parts = cronExpr.split(' ');
        const minute = parts[0];
        const hour = parts[1];
        const dayOfMonth = parts[2];
        const month = parts[3];
        const dayOfWeek = parts[4];

        const next = new Date(fromDate);
        next.setSeconds(0, 0);

        // Simple calculation for common patterns
        if (minute === '*/5') {
            next.setMinutes(Math.ceil(next.getMinutes() / 5) * 5);
        } else if (minute === '0') {
            next.setMinutes(0);
            next.setHours(next.getHours() + 1);
        } else if (minute === '*/10') {
            next.setMinutes(Math.ceil(next.getMinutes() / 10) * 10);
        } else if (minute === '55' && hour === '23') {
            next.setMinutes(55);
            next.setHours(23);
            if (next <= fromDate) {
                next.setDate(next.getDate() + 1);
            }
        }

        return next;
    }
}

// Run the test
if (require.main === module) {
    const testInstance = new CronTest();
    testInstance.runTest();
}

module.exports = CronTest;


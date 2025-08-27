const CSVManager = require('./src/csvManager');

class TaskTimingTest {
    constructor() {
        this.testTasks = [
            {
                "TaskID": "TIMING-TEST-001",
                "Task Name": "Test Task 1",
                "Description": "This task should be ready (no execution time)",
                "Execution Time": "",
                "Status": "Pending"
            },
            {
                "TaskID": "TIMING-TEST-002", 
                "Task Name": "Test Task 2",
                "Description": "This task should be ready (past execution time)",
                "Execution Time": "0:00", // Midnight - should be ready
                "Status": "Pending"
            },
            {
                "TaskID": "TIMING-TEST-003",
                "Task Name": "Test Task 3", 
                "Description": "This task should NOT be ready (future execution time)",
                "Execution Time": "23:59", // Almost midnight - should not be ready
                "Status": "Pending"
            },
            {
                "TaskID": "TIMING-TEST-004",
                "Task Name": "Test Task 4",
                "Description": "This task is not pending",
                "Execution Time": "12:00",
                "Status": "Completed"
            }
        ];
    }

    async runTest() {
        console.log('🧪 Starting Task Timing Test...');
        console.log('⏰ Current time:', new Date().toLocaleString());
        console.log('');

        // Test individual task readiness
        console.log('📋 Testing individual task readiness:');
        for (const task of this.testTasks) {
            const isReady = CSVManager.isTaskReady(task);
            const status = isReady ? '✅ READY' : '⏳ NOT READY';
            console.log(`   ${task["TaskID"]}: ${status} (Status: ${task["Status"]}, Time: ${task["Execution Time"] || "None"})`);
        }

        console.log('');
        console.log('📊 Testing getReadyTasks method:');
        
        // Simulate the getReadyTasks logic
        const readyTasks = this.testTasks.filter(task => CSVManager.isTaskReady(task));
        console.log(`   Found ${readyTasks.length} ready tasks:`);
        
        for (const task of readyTasks) {
            console.log(`   - ${task["TaskID"]}: ${task["Task Name"]}`);
        }

        console.log('');
        console.log('✅ Task timing test completed!');
    }
}

// Run the test
if (require.main === module) {
    const testInstance = new TaskTimingTest();
    testInstance.runTest();
}

module.exports = TaskTimingTest;


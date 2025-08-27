const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');
const { CSV_FILE_PATH } = require('./config');
const TimeHelper = require('./timeHelper');

class CSVManager {
    /**
     * Get task by TaskID
     */
    static async getTaskByID(taskID) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    if (row["TaskID"] === taskID ||row["TaskID"] === `TASK-${taskID}` ) {
                        resolve(row);
                    }
                })
                .on("end", () => {
                    reject(new Error(`Task with ID ${taskID} not found`));
                })
                .on("error", reject);
        });
    }

    /**
     * Update task status in CSV by TaskID
     */
    static async updateTaskStatusByID(taskID, status, respondedBy = '') {
        return new Promise((resolve, reject) => {
            const tasks = [];
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    if (row["TaskID"] === taskID) {
                        row["Status"] = status;
                        row["Response Time"] = new Date().toLocaleString();
                        row["Responded By"] = respondedBy;
                        console.log(`✏️ Updated status for: "${taskID}" → ${status}`);
                    }
                    tasks.push(row);
                })
                .on("end", () => {
                    try {
                        const csvData = parse(tasks, { fields: Object.keys(tasks[0]) });
                        fs.writeFileSync(CSV_FILE_PATH, csvData, "utf8");
                        console.log(`💾 CSV file updated successfully.`);
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on("error", reject);
        });
    }

    /**
     * Get all pending tasks that are ready to be sent (execution time reached)
     */
    static async getPendingTasks() {
        return new Promise((resolve, reject) => {
            const tasks = [];
            const now = new Date();
            
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    if (row["Status"] === "Pending") {
                        // Parse execution time (format: "HH:MM")
                        const executionTime = row["Execution Time"];
                        if (executionTime) {
                            const taskDateTime = TimeHelper.executionTimeToDateTime(executionTime);
                            
                            if (taskDateTime && taskDateTime <= now) {
                                tasks.push(row);
                                console.log(`⏰ Task ${row["TaskID"]} ready to send (execution time: ${executionTime})`);
                            } 
                            // else {
                            //      console.log(`⏳ Task ${row["TaskID"]} not ready yet (execution time: ${executionTime})`);
                            // }
                        } else {
                            // If no execution time specified, consider it ready
                            tasks.push(row);
                            console.log(`⏰ Task ${row["TaskID"]} ready to send (no execution time specified)`);
                        }
                    }
                })
                .on("end", () => {
                    resolve(tasks);
                })
                .on("error", reject);
        });
    }

    /**
     * Get all tasks that are ready to be sent (execution time reached)
     */
    static async getReadyTasks() {
        return new Promise((resolve, reject) => {
            const tasks = [];
            const now = new Date();
            
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    if (row["Status"] === "Pending") {
                        // Parse execution time (format: "HH:MM")
                        const executionTime = row["Execution Time"];
                        if (executionTime) {
                            const taskDateTime = TimeHelper.executionTimeToDateTime(executionTime);
                            
                            if (taskDateTime && taskDateTime <= now) {
                                tasks.push(row);
                                console.log(`⏰ Task ${row["TaskID"]} ready to send (execution time: ${executionTime})`);
                            } 
                            // else {
                            //     console.log(`⏳ Task ${row["TaskID"]} not ready yet (execution time: ${executionTime})`);
                            // }
                        } else {
                            // If no execution time specified, consider it ready
                            tasks.push(row);
                            console.log(`⏰ Task ${row["TaskID"]} ready to send (no execution time specified)`);
                        }
                    }
                })
                .on("end", () => {
                    resolve(tasks);
                })
                .on("error", reject);
        });
    }

    /**
     * Get all tasks with a specific status
     */
    static async getTasksByStatus(status) {
        return new Promise((resolve, reject) => {
            const tasks = [];
            fs.createReadStream(CSV_FILE_PATH)
                .pipe(csv())
                .on("data", (row) => {
                    if (row["Status"] === status) {
                        tasks.push(row);
                    }
                })
                .on("end", () => {
                    resolve(tasks);
                })
                .on("error", reject);
        });
    }

    /**
     * Get all pending tasks (regardless of execution time)
     */
    static async getAllPendingTasks() {
        return this.getTasksByStatus("Pending");
    }

    /**
     * Check if a specific task is ready to be sent (execution time reached)
     */
    static isTaskReady(task) {
        if (task["Status"] !== "Pending") {
            return false;
        }

        const executionTime = task["Execution Time"];
        if (!executionTime) {
            return true; // No execution time specified, consider ready
        }

        const taskDateTime = TimeHelper.executionTimeToDateTime(executionTime);
        const now = new Date();
        
        return taskDateTime && taskDateTime <= now;
    }
}

module.exports = CSVManager;



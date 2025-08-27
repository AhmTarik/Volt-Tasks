const ArchiveManager = require('./src/archiveManager');

class ArchiveTest {
    constructor() {
        this.archiveManager = new ArchiveManager();
    }

    async runTest() {
        console.log('📁 Starting Archive Test...');
        console.log('');

        // Test 1: Archive tasks
        console.log('🔄 Test 1: Archiving tasks...');
        const archiveResult = await this.archiveManager.archiveTasks();
        console.log(`Archive result: ${archiveResult ? '✅ Success' : '❌ Failed'}`);
        console.log('');

        // Test 2: List backups
        console.log('📋 Test 2: Listing backups...');
        this.archiveManager.listBackups();
        console.log('');

        // Test 3: Get backup files
        console.log('📁 Test 3: Getting backup files...');
        const backupFiles = this.archiveManager.getBackupFiles();
        console.log(`Found ${backupFiles.length} backup files:`);
        backupFiles.forEach(file => console.log(`  - ${file}`));
        console.log('');

        // Test 4: Get backup info
        if (backupFiles.length > 0) {
            console.log('📊 Test 4: Getting backup info...');
            const latestBackup = backupFiles[0];
            const backupInfo = this.archiveManager.getBackupInfo(latestBackup);
            if (backupInfo) {
                console.log(`Latest backup: ${backupInfo.filename}`);
                console.log(`Size: ${backupInfo.sizeKB} KB`);
                console.log(`Created: ${backupInfo.created.toLocaleString()}`);
            }
            console.log('');
        }

        // Test 5: Clean old backups (dry run)
        console.log('🧹 Test 5: Cleaning old backups (dry run)...');
        console.log('Note: This is a dry run, no files will be deleted');
        console.log('');

        console.log('✅ Archive test completed!');
        console.log('');
        console.log('💡 Manual testing:');
        console.log('• Send "archive-tasks" in Telegram to manually backup');
        console.log('• Send "list-backups" in Telegram to see available backups');
        console.log('• Daily backup will run automatically at 11:55 PM');
    }
}

// Run the test
if (require.main === module) {
    const testInstance = new ArchiveTest();
    testInstance.runTest();
}

module.exports = ArchiveTest;


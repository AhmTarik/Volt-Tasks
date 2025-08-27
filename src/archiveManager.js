const fs = require('fs');
const path = require('path');
const { CSV_FILE_PATH } = require('./config');

class ArchiveManager {
    constructor() {
        this.backupDir = 'daily-backups';
        this.ensureBackupDirectory();
    }

    /**
     * Ensure the backup directory exists
     */
    ensureBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
            console.log(`📁 Created backup directory: ${this.backupDir}`);
        }
    }

    /**
     * Get current date in YYYY-MM-DD format
     */
    getCurrentDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Create backup filename with date
     */
    getBackupFilename() {
        const dateString = this.getCurrentDateString();
        return `tasks-${dateString}.csv`;
    }

    /**
     * Get full backup file path
     */
    getBackupFilePath() {
        return path.join(this.backupDir, this.getBackupFilename());
    }

    /**
     * Archive tasks.csv to daily backup
     */
    async archiveTasks() {
        try {
            // Check if source file exists
            if (!fs.existsSync(CSV_FILE_PATH)) {
                console.log(`⚠️ Source file not found: ${CSV_FILE_PATH}`);
                return false;
            }

            const backupPath = this.getBackupFilePath();
            
            // Check if backup already exists for today
            if (fs.existsSync(backupPath)) {
                console.log(`📋 Backup already exists for today: ${backupPath}`);
                return true;
            }

            // Copy the file
            fs.copyFileSync(CSV_FILE_PATH, backupPath);
            
            // Get file stats for logging
            const stats = fs.statSync(backupPath);
            const fileSize = (stats.size / 1024).toFixed(2); // Convert to KB
            
            console.log(`✅ Tasks archived successfully!`);
            console.log(`📁 Backup location: ${backupPath}`);
            console.log(`📊 File size: ${fileSize} KB`);
            console.log(`📅 Date: ${this.getCurrentDateString()}`);
            
            return true;

        } catch (error) {
            console.error(`❌ Error archiving tasks: ${error.message}`);
            return false;
        }
    }

    /**
     * Get list of all backup files
     */
    getBackupFiles() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                return [];
            }

            const files = fs.readdirSync(this.backupDir);
            return files
                .filter(file => file.startsWith('tasks-') && file.endsWith('.csv'))
                .sort()
                .reverse(); // Most recent first
        } catch (error) {
            console.error(`❌ Error reading backup directory: ${error.message}`);
            return [];
        }
    }

    /**
     * Get backup file info
     */
    getBackupInfo(filename) {
        try {
            const filePath = path.join(this.backupDir, filename);
            if (!fs.existsSync(filePath)) {
                return null;
            }

            const stats = fs.statSync(filePath);
            return {
                filename,
                path: filePath,
                size: stats.size,
                sizeKB: (stats.size / 1024).toFixed(2),
                created: stats.birthtime,
                modified: stats.mtime
            };
        } catch (error) {
            console.error(`❌ Error getting backup info: ${error.message}`);
            return null;
        }
    }

    /**
     * List all backups with details
     */
    listBackups() {
        const backups = this.getBackupFiles();
        
        if (backups.length === 0) {
            console.log('📋 No backup files found');
            return;
        }

        console.log(`📋 Found ${backups.length} backup files:`);
        console.log('');

        for (const filename of backups) {
            const info = this.getBackupInfo(filename);
            if (info) {
                console.log(`📁 ${filename}`);
                console.log(`   📊 Size: ${info.sizeKB} KB`);
                console.log(`   📅 Created: ${info.created.toLocaleString()}`);
                console.log('');
            }
        }
    }

    /**
     * Clean old backups (keep last 30 days)
     */
    cleanOldBackups() {
        try {
            const backups = this.getBackupFiles();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            let deletedCount = 0;

            for (const filename of backups) {
                const info = this.getBackupInfo(filename);
                if (info && info.created < thirtyDaysAgo) {
                    fs.unlinkSync(info.path);
                    console.log(`🗑️ Deleted old backup: ${filename}`);
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`✅ Cleaned ${deletedCount} old backup files`);
            } else {
                console.log(`📋 No old backups to clean`);
            }

        } catch (error) {
            console.error(`❌ Error cleaning old backups: ${error.message}`);
        }
    }
}

module.exports = ArchiveManager;


/**
 * Simple Time Helper
 * Converts execution time from CSV to datetime object
 */

class TimeHelper {
    /**
     * Convert execution time (HH:MM) to datetime object
     * @param {string} executionTime - Time in format "HH:MM"
     * @returns {Date} DateTime object for today with the specified time
     */
    static executionTimeToDateTime(executionTime) {
        if (!executionTime || typeof executionTime !== 'string') {
            return null;
        }

        try {
            const [hours, minutes] = executionTime.split(':').map(Number);
            
            if (isNaN(hours) || isNaN(minutes)) {
                console.warn(`⚠️ Invalid time format: ${executionTime}`);
                return null;
            }

            const dateTime = new Date();
            dateTime.setHours(hours, minutes, 0, 0);
            
            return dateTime;
        } catch (error) {
            console.error(`❌ Error parsing execution time "${executionTime}":`, error.message);
            return null;
        }
    }

    /**
     * Format time as AM/PM (Hours:Minutes AM/PM)
     * @param {string|Date} time - Time string (HH:MM) or Date object
     * @returns {string} Formatted time as "Hours:Minutes AM/PM"
     */
    static formatTimeAsAMPM(time) {
        if (!time) {
            return '';
        }

        try {
            let dateTime;
            
            // If it's a string, convert to datetime first
            if (typeof time === 'string') {
                // Check if it's already a datetime string or just time
                if (time.includes(':')) {
                    // If it's just time (HH:MM), convert using TimeHelper
                    if (time.split(':').length === 2) {
                        dateTime = this.executionTimeToDateTime(time);
                    } else {
                        // If it's a full datetime string, parse directly
                        dateTime = new Date(time);
                    }
                } else {
                    // If it's not a time format, return as is
                    return time;
                }
            } else if (time instanceof Date) {
                dateTime = time;
            } else {
                return String(time);
            }

            if (!dateTime || isNaN(dateTime.getTime())) {
                return String(time);
            }

            return dateTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

        } catch (error) {
            console.error(`❌ Error formatting time "${time}":`, error.message);
            return String(time);
        }
    }

    /**
     * Format time as 24-hour format (HH:MM)
     * @param {string|Date} time - Time string (HH:MM) or Date object
     * @returns {string} Formatted time as "HH:MM"
     */
    static formatTimeAs24Hour(time) {
        if (!time) {
            return '';
        }

        try {
            let dateTime;
            
            // If it's a string, convert to datetime first
            if (typeof time === 'string') {
                if (time.includes(':')) {
                    if (time.split(':').length === 2) {
                        dateTime = this.executionTimeToDateTime(time);
                    } else {
                        dateTime = new Date(time);
                    }
                } else {
                    return time;
                }
            } else if (time instanceof Date) {
                dateTime = time;
            } else {
                return String(time);
            }

            if (!dateTime || isNaN(dateTime.getTime())) {
                return String(time);
            }

            return dateTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });

        } catch (error) {
            console.error(`❌ Error formatting time "${time}":`, error.message);
            return String(time);
        }
    }
}

module.exports = TimeHelper;

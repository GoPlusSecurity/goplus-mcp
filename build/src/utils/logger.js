import fs from 'fs';
import path from 'path';
import os from 'os';
class Logger {
    logDir;
    logFile;
    constructor() {
        // Use the user's temporary directory to save logs, ensuring write permissions
        this.logDir = path.join(os.tmpdir(), 'goplus-mcp-logs');
        this.logFile = path.join(this.logDir, 'application.log');
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }
    writeLog(level, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [${level}] - ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage);
    }
    info(message) {
        this.writeLog('INFO', message);
    }
    warn(message) {
        this.writeLog('WARN', message);
    }
    error(message) {
        this.writeLog('ERROR', message);
    }
}
export const logger = new Logger();

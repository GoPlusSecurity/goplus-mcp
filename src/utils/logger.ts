import fs from 'fs';
import path from 'path';
import os from 'os';

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    // Use the user's temporary directory to save logs, ensuring write permissions
    this.logDir = path.join(os.tmpdir(), 'goplus-mcp-logs');
    this.logFile = path.join(this.logDir, 'application.log');

    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeLog(level: string, message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} [${level}] - ${message}\n`;
    fs.appendFileSync(this.logFile, logMessage);
  }

  info(message: string) {
    this.writeLog('INFO', message);
  }

  warn(message: string) {
    this.writeLog('WARN', message);
  }

  error(message: string) {
    this.writeLog('ERROR', message);
  }
}

export const logger = new Logger(); 
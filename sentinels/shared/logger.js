class Logger {
  constructor(sentinelName) {
    this.name = sentinelName;
    this.logs = [];
  }

  info(msg) {
    const formatted = `[${this.name}] INFO: ${msg}`;
    console.log(formatted);
    this.logs.push({ level: 'INFO', message: msg, timestamp: new Date().toISOString() });
  }

  warn(msg) {
    const formatted = `[${this.name}] WARN: ${msg}`;
    console.warn(formatted);
    this.logs.push({ level: 'WARN', message: msg, timestamp: new Date().toISOString() });
  }

  error(msg, err) {
    const errorMsg = err ? `${msg} (Error: ${err.message || err})` : msg;
    const formatted = `[${this.name}] ERROR: ${errorMsg}`;
    console.error(formatted);
    this.logs.push({ level: 'ERROR', message: errorMsg, timestamp: new Date().toISOString() });
  }

  getLogs() {
    return this.logs;
  }
}

module.exports = { Logger };

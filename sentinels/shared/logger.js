function log(sentinel, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${sentinel.toUpperCase()}] ${message}`);
}

function error(sentinel, message, err) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${sentinel.toUpperCase()}] ERROR: ${message}`, err || '');
}

module.exports = {
  log,
  error
};

const LEVELS = { trace: 0, debug: 1, info: 2, error: 3 };

function createLogger() {
    let currentLevel = LEVELS.info;

    function format(level, message) {
        const timestamp = new Date().toISOString();
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }

    return {
        trace(message) {
            if (currentLevel <= LEVELS.trace) console.log(format('trace', message));
        },
        debug(message) {
            if (currentLevel <= LEVELS.debug) console.log(format('debug', message));
        },
        info(message) {
            if (currentLevel <= LEVELS.info) console.log(format('info', message));
        },
        error(message) {
            if (currentLevel <= LEVELS.error) console.error(format('error', message));
        },
        setLevel(level) {
            if (LEVELS[level] !== undefined) currentLevel = LEVELS[level];
        }
    };
}

module.exports = createLogger;

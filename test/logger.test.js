const test = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');

const createLogger = require('../src/logger');

test.afterEach(() => {
    mock.method(console, 'log', () => {}).mock.restore();
    mock.method(console, 'error', () => {}).mock.restore();
});

test('default level is info: trace and debug suppressed, info and error shown', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const errorSpy = mock.method(console, 'error', () => {});
    const logger = createLogger();

    logger.trace('trace-msg');
    logger.debug('debug-msg');
    logger.info('info-msg');
    logger.error('error-msg');

    assert.strictEqual(logSpy.mock.calls.length, 1);
    assert.match(logSpy.mock.calls[0].arguments[0], /\[INFO\] info-msg/);
    assert.strictEqual(errorSpy.mock.calls.length, 1);
    assert.match(errorSpy.mock.calls[0].arguments[0], /\[ERROR\] error-msg/);
});

test('setLevel("trace") enables all levels', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const errorSpy = mock.method(console, 'error', () => {});
    const logger = createLogger();
    logger.setLevel('trace');

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.error('e');

    assert.strictEqual(logSpy.mock.calls.length, 3);
    assert.match(logSpy.mock.calls[0].arguments[0], /\[TRACE\] t/);
    assert.match(logSpy.mock.calls[1].arguments[0], /\[DEBUG\] d/);
    assert.match(logSpy.mock.calls[2].arguments[0], /\[INFO\] i/);
    assert.strictEqual(errorSpy.mock.calls.length, 1);
    assert.match(errorSpy.mock.calls[0].arguments[0], /\[ERROR\] e/);
});

test('setLevel("error") suppresses trace, debug, and info', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const errorSpy = mock.method(console, 'error', () => {});
    const logger = createLogger();
    logger.setLevel('error');

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.error('e');

    assert.strictEqual(logSpy.mock.calls.length, 0);
    assert.strictEqual(errorSpy.mock.calls.length, 1);
});

test('setLevel("debug") enables debug, info, error but suppresses trace', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const errorSpy = mock.method(console, 'error', () => {});
    const logger = createLogger();
    logger.setLevel('debug');

    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    logger.error('e');

    assert.strictEqual(logSpy.mock.calls.length, 2);
    assert.match(logSpy.mock.calls[0].arguments[0], /\[DEBUG\] d/);
    assert.match(logSpy.mock.calls[1].arguments[0], /\[INFO\] i/);
    assert.strictEqual(errorSpy.mock.calls.length, 1);
});

test('setLevel with invalid level is ignored', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const logger = createLogger();
    logger.setLevel('bogus');

    logger.info('still-works');
    assert.strictEqual(logSpy.mock.calls.length, 1);
    assert.match(logSpy.mock.calls[0].arguments[0], /\[INFO\] still-works/);
});

test('output format includes ISO timestamp, level, and message', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const logger = createLogger();

    logger.info('hello world');

    const output = logSpy.mock.calls[0].arguments[0];
    assert.match(output, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] hello world$/);
});

test('error uses console.error, not console.log', () => {
    const logSpy = mock.method(console, 'log', () => {});
    const errorSpy = mock.method(console, 'error', () => {});
    const logger = createLogger();

    logger.error('fail');

    assert.strictEqual(logSpy.mock.calls.length, 0);
    assert.strictEqual(errorSpy.mock.calls.length, 1);
});

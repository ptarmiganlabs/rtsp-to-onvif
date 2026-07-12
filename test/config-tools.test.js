const test = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');
const fs = require('node:fs');
const cp = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const fixture = path.join(__dirname, 'fixtures', 'valid-config.yaml');

// Patch net-tools exports on the cached module BEFORE config-tools loads it,
// so readAndCheckConfig uses our deterministic uuid/mac and controllable IP lookup.
const netTools = require('../src/net-tools');
let ipForMac = '192.168.1.50';

const getIp4Mock = mock.method(netTools, 'getIp4FromMac', () => ipForMac);
const uuidMock = mock.method(netTools, 'generateUUIDv4', () => 'uuid-generated');
const macMock = mock.method(netTools, 'generateNetworkMac', () => '1A:11:B0:22:22:22');

// Patch child_process.spawnSync (destructured by config-tools at load) so the
// ip/dhclient calls stay hermetic and observable.
const spawnSyncMock = mock.method(cp, 'spawnSync', () => ({ stdout: Buffer.from('') }));

test.after(() => {
    getIp4Mock.mock.restore();
    uuidMock.mock.restore();
    macMock.mock.restore();
    spawnSyncMock.mock.restore();
});

const { readAndCheckConfig } = require('../src/config-tools');

const realWrite = fs.writeFileSync;
const writeSpy = mock.method(fs, 'writeFileSync', (...args) => realWrite.apply(fs, args));

function makeLogger() {
    return { debug() {}, info() {}, error() {}, trace() {} };
}

function writeTempConfig(yamlText) {
    const tmp = path.join(os.tmpdir(), `rtsp-test-${process.pid}-${Math.random().toString(36).slice(2)}.yaml`);
    fs.writeFileSync(tmp, yamlText, 'utf8');
    return tmp;
}

test.beforeEach(() => {
    spawnSyncMock.mock.resetCalls();
    writeSpy.mock.resetCalls();
    ipForMac = '192.168.1.50';
});

test('returns the config unchanged when uuid+mac are present (no write, no ip/dhclient)', () => {
    const config = readAndCheckConfig(makeLogger(), fixture);
    assert.strictEqual(config.onvif[0].uuid, 'uuid-fixed');
    assert.strictEqual(config.onvif[0].mac, '1A:11:B0:AA:BB:CC');
    assert.strictEqual(writeSpy.mock.calls.length, 0);
    assert.ok(!spawnSyncMock.mock.calls.some((c) => c.arguments[0] === 'ip'));
    assert.ok(!spawnSyncMock.mock.calls.some((c) => c.arguments[0] === 'dhclient'));
});

test('populates missing uuid/mac and writes the updated config', () => {
    const yaml = `onvif:
  - name: NoIds
    dev: eth0
    target:
      hostname: 192.168.1.100
      ports:
        rtsp: 554
        snapshot: 80
    highQuality:
      rtsp: /h
      snapshot: /s
      width: 1920
      height: 1080
      framerate: 15
      bitrate: 4096
      quality: 4
    ports:
      server: 8081
      rtsp: 8554
      snapshot: 8080
`;
    const tmp = writeTempConfig(yaml);
    writeSpy.mock.resetCalls();
    try {
        const config = readAndCheckConfig(makeLogger(), tmp);
        assert.strictEqual(config.onvif[0].uuid, 'uuid-generated');
        assert.strictEqual(config.onvif[0].mac, '1A:11:B0:22:22:22');
        assert.strictEqual(writeSpy.mock.calls.length, 1);
    } finally {
        fs.unlinkSync(tmp);
    }
});

test('runs ip + dhclient when the MAC has no matching interface', () => {
    ipForMac = null;
    const yaml = `onvif:
  - name: NoMac
    dev: eth0
    mac: 1A:11:B0:00:00:01
    uuid: uuid-fixed
    target:
      hostname: 192.168.1.100
      ports:
        rtsp: 554
        snapshot: 80
    highQuality:
      rtsp: /h
      snapshot: /s
      width: 1920
      height: 1080
      framerate: 15
      bitrate: 4096
      quality: 4
    ports:
      server: 8081
      rtsp: 8554
      snapshot: 8080
`;
    const tmp = writeTempConfig(yaml);
    try {
        readAndCheckConfig(makeLogger(), tmp);
        assert.ok(spawnSyncMock.mock.calls.some((c) => c.arguments[0] === 'ip'), 'expected ip spawnSync');
        assert.ok(spawnSyncMock.mock.calls.some((c) => c.arguments[0] === 'dhclient'), 'expected dhclient spawnSync');
    } finally {
        fs.unlinkSync(tmp);
    }
});

test('exits with -1 when the config file is missing', () => {
    const exitSpy = mock.method(process, 'exit', (code) => { throw new Error('EXIT:' + code); });
    try {
        assert.throws(() => readAndCheckConfig(makeLogger(), '/no/such/file.yaml'), /EXIT:-1/);
    } finally {
        exitSpy.mock.restore();
    }
});

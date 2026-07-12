const test = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');
const os = require('node:os');

const netTools = require('../src/net-tools');

function makeLogger() {
    return { debug() {}, info() {}, error() {}, trace() {} };
}

test.describe('net-tools', () => {
    test('generateNetworkMac returns LAA-format MAC built from odd hex chars', () => {
        const mac = netTools.generateNetworkMac();
        assert.match(mac, /^1A:11:B0:[0-9A-F]{2}:[0-9A-F]{2}:[0-9A-F]{2}$/);
        const hexChars = mac.split(':').slice(3).join('').split('');
        for (const c of hexChars) {
            assert.ok('13579BDF'.includes(c), `unexpected MAC char ${c}`);
        }
    });

    test('generateUUIDv4 returns a valid v4 UUID', () => {
        const id = netTools.generateUUIDv4();
        assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('getIp4FromMac finds the matching interface (case-insensitive) and returns its IPv4', () => {
        const m = mock.method(os, 'networkInterfaces', () => ({
            eth0: [
                { family: 'IPv4', mac: 'AA:BB:CC:DD:EE:FF', address: '192.168.1.50' },
                { family: 'IPv6', mac: 'AA:BB:CC:DD:EE:FF', address: 'fe80::1' }
            ]
        }));
        try {
            assert.strictEqual(netTools.getIp4FromMac(makeLogger(), 'aa:bb:cc:dd:ee:ff'), '192.168.1.50');
        } finally {
            m.mock.restore();
        }
    });

    test('getIp4FromMac returns null when no interface matches the MAC', () => {
        const m = mock.method(os, 'networkInterfaces', () => ({
            eth0: [{ family: 'IPv4', mac: '00:00:00:00:00:00', address: '10.0.0.1' }]
        }));
        try {
            assert.strictEqual(netTools.getIp4FromMac(makeLogger(), 'aa:bb:cc:dd:ee:ff'), null);
        } finally {
            m.mock.restore();
        }
    });
});

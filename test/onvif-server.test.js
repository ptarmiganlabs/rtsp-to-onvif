const test = require('node:test');
const assert = require('node:assert');
const { mock } = require('node:test');
const os = require('node:os');

const OnvifServer = require('../src/onvif-server');

function makeLogger() {
    return { debug() {}, info() {}, error() {}, trace() {}, setLevel() {} };
}

function baseConfig(extra = {}) {
    return Object.assign({
        name: 'TestCam',
        mac: 'aa:bb:cc:dd:ee:ff',
        uuid: 'uuid-test',
        ports: { server: 8081, rtsp: 8554, snapshot: 8080 },
        highQuality: { rtsp: '/high', snapshot: '/high.jpg', width: 1920, height: 1080, framerate: 15, bitrate: 2048, quality: 4 },
        lowQuality: { rtsp: '/low', snapshot: '/low.jpg', width: 640, height: 480, framerate: 10, bitrate: 512, quality: 3 }
    }, extra);
}

test.describe('OnvifServer SOAP handlers', () => {
    let netMock;
    test.before(() => {
        netMock = mock.method(os, 'networkInterfaces', () => ({
            test0: [{ family: 'IPv4', mac: 'aa:bb:cc:dd:ee:ff', address: '192.168.1.50' }]
        }));
    });
    test.after(() => { if (netMock) netMock.mock.restore(); });

    test('resolves hostname from the configured MAC', () => {
        const server = new OnvifServer(makeLogger(), baseConfig());
        assert.strictEqual(server.getHostname(), '192.168.1.50');
    });

    test('GetCapabilities(All) returns Device and Media XAddrs on the server port', () => {
        const server = new OnvifServer(makeLogger(), baseConfig());
        const res = server.onvif.DeviceService.Device.GetCapabilities({ Category: 'All' });
        assert.match(res.Capabilities.Device.XAddr, /192\.168\.1\.50:8081/);
        assert.match(res.Capabilities.Media.XAddr, /192\.168\.1\.50:8081/);
    });

    test('GetProfiles count reflects the presence of lowQuality', () => {
        assert.strictEqual(
            new OnvifServer(makeLogger(), baseConfig()).onvif.MediaService.Media.GetProfiles({}).Profiles.length,
            2
        );
        assert.strictEqual(
            new OnvifServer(makeLogger(), baseConfig({ lowQuality: undefined })).onvif.MediaService.Media.GetProfiles({}).Profiles.length,
            1
        );
    });

    test('GetSnapshotUri routes the high stream by default and lowQuality for sub_stream', () => {
        const server = new OnvifServer(makeLogger(), baseConfig());
        assert.strictEqual(
            server.onvif.MediaService.Media.GetSnapshotUri({}).MediaUri.Uri,
            'http://192.168.1.50:8080/high.jpg'
        );
        assert.strictEqual(
            server.onvif.MediaService.Media.GetSnapshotUri({ ProfileToken: 'sub_stream' }).MediaUri.Uri,
            'http://192.168.1.50:8080/low.jpg'
        );
    });

    test('GetStreamUri builds an rtsp URI with the high/low path', () => {
        const server = new OnvifServer(makeLogger(), baseConfig());
        assert.strictEqual(
            server.onvif.MediaService.Media.GetStreamUri({}).MediaUri.Uri,
            'rtsp://192.168.1.50:8554/high'
        );
        assert.strictEqual(
            server.onvif.MediaService.Media.GetStreamUri({ ProfileToken: 'sub_stream' }).MediaUri.Uri,
            'rtsp://192.168.1.50:8554/low'
        );
    });

    test('GetDeviceInformation returns the expected identity fields', () => {
        const server = new OnvifServer(makeLogger(), baseConfig());
        const info = server.onvif.DeviceService.Device.GetDeviceInformation({});
        assert.strictEqual(info.Manufacturer, 'rtsp-2-onvif');
        assert.strictEqual(info.Model, 'TestCam');
    });
});

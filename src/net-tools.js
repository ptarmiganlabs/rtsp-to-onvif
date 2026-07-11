const os = require('os');
const { v4: uuidv4 } = require('uuid');


function getIp4FromMac(logger, macAddress) {
    let networkInterfaces = os.networkInterfaces();

    for (let networkInterface in networkInterfaces) {
        //logger.trace(interface);
        for (let network of networkInterfaces[networkInterface]) {
            //logger.trace(network);
            if (network.family == 'IPv4' && network.mac.toLowerCase() == macAddress.toLowerCase()) {
                logger.debug(`NET_SCAN: Found ${network.address} on ${networkInterface} for MAC ${macAddress.toLowerCase()}`)
                return network.address;
            }
        }
    }
    logger.error(`NET_SCAN: No interface with MAC ${macAddress.toLowerCase()}`);
    return null;
}

// Generate a UUIDv4
function generateUUIDv4() {
    return uuidv4();
}

//Prefix - Unicast LAA
function generateNetworkMac() {
    return "1A:11:B0:XX:XX:XX".replace(/X/g, function () {
        return "13579BDF".charAt(Math.floor(Math.random() * 8));
    })
}

module.exports = {
    getIp4FromMac,
    generateUUIDv4,
    generateNetworkMac
}
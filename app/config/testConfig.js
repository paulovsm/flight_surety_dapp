
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    ];


    let contractOwnerAddress = accounts[0];
    let firstAirlineAddress = accounts[1];
    let secondAirlineAddress = accounts[2];
    let thirdAirlineAddress = accounts[3];
    let fourthAirlineAddress = accounts[4];
    let fifthAirlineAddress = accounts[5];
    let passengerAddress1 = accounts[6];
    let passengerAddress2 = accounts[7];

    let ts201 = new Date(2021, 12, 26, 10, 30);
    let ts202 = new Date(2021, 12, 26, 11, 30);
    let ts203 = new Date(2021, 12, 26, 12, 30);

    let flightSuretyData = await FlightSuretyData.deployed(firstAirlineAddress, {from: contractOwnerAddress});
    let flightSuretyApp = await FlightSuretyApp.deployed(flightSuretyData.address, {from: contractOwnerAddress});

    
    return {
        owner: contractOwnerAddress,
        firstAirline: firstAirlineAddress,
        secondAirlineAddress: secondAirlineAddress,
        thirdAirlineAddress: thirdAirlineAddress,
        fourthAirlineAddress: fourthAirlineAddress,
        fifthAirlineAddress: fifthAirlineAddress,
        passengerAddress1: passengerAddress1,
        passengerAddress2: passengerAddress2,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};
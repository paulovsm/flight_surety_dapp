const fs = require('fs');
const flightSuretyApp = artifacts.require("FlightSuretyApp");
const flightSuretyData = artifacts.require("FlightSuretyData");

module.exports = function(deployer, network, accounts) {
    let contractOwner = accounts[0];
    let firstAirline = accounts[1];
    deployer.deploy(flightSuretyData, firstAirline, contractOwner)
    .then(() => {
        return deployer.deploy(flightSuretyApp, flightSuretyData.address, contractOwner)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:9545',
                            contractOwner: contractOwner,
                            firstAirline: firstAirline,
                            dataAddress: flightSuretyData.address,
                            appAddress: flightSuretyApp.address,
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    })};
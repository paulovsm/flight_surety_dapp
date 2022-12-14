import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill');


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
const accounts = web3.eth.getAccounts();
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
let oracles = [];

async function registerOracles() {
  let fee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
  let accts = await accounts;
  let numberOfOracles = 40;


  for (var i = 30; i < numberOfOracles; i++) {
    try {

      let gasAmount = await flightSuretyApp.methods.registerOracle().estimateGas({
        from: accts[i],
        value: fee
      });

      await flightSuretyApp.methods.registerOracle().send({
        from: accts[i],
        value: fee,
        gas: gasAmount
      });

      oracles.push(accts[i]);

    } catch (error) {
      console.log(error.message);
    }

    await sleep(2000)
  }


}

async function submitOracleResponse(airline, flight, timestamp) {
  for (var i = 0; i < oracles.length; i++) {
    var statusCode = (Math.floor(Math.random() * Math.floor(4)) + 1) * 10 + 10;
    var indexes = [];

    try {
      indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracles[i] });
    } catch (error) {
      console.log(error.message);
    }


    for (var j = 0; j < indexes.length; j++) {
      try {
        let gasAmount = await flightSuretyApp.methods.submitOracleResponse(indexes[j], airline, flight, timestamp, statusCode)
          .estimateGas({ from: oracles[i] });

        await flightSuretyApp.methods.submitOracleResponse(indexes[j], airline, flight, timestamp, statusCode)
          .send({ from: oracles[i], gas: gasAmount });

      } catch (e) {
        console.log(e.message);
      }
    }

  }
}

async function listenForEvents() {

  /****************************************************************
   ****************** FLIGHT SURETY APP EVENTS *******************
   ****************************************************************/
  flightSuretyApp.events.FlightStatusInfo({}, (error, event) => {
    logEvent(error, event, "FLIGHT STATUS REPORT");
  });

  flightSuretyApp.events.OracleReport({}, (error, event) => {
    logEvent(error, event, "ORACLE REPORT");
  });

  flightSuretyApp.events.OracleRegistered({}, (error, event) => {
    logEvent(error, event, "ORACLE REGISTERED");
  });

  flightSuretyApp.events.OracleRequest({}, async (error, event) => {
    logEvent(error, event, "ORACLE REQUEST");
    if (!error) {
      await submitOracleResponse(
        event.returnValues[1], // airline
        event.returnValues[2], // flight
        event.returnValues[3] // timestamp
      );
    }
  });

  /****************************************************************
   ****************** FLIGHT SURETY DATA EVENTS *******************
   ****************************************************************/
  flightSuretyData.events.AirlineRegistered({}, (error, event) => {
    logEvent(error, event, "AIRLINE REGISTERED");
  });

  flightSuretyData.events.AirlineFunded({}, (error, event) => {
    logEvent(error, event, "AIRLINE FUNDED");
  });

  flightSuretyData.events.FlightRegistered({}, (error, event) => {
    logEvent(error, event, "FLIGHT REGISTERED");
  });

  flightSuretyData.events.PassengerInsured({}, (error, event) => {
    logEvent(error, event, "PASSENGER INSURED");
  });

  flightSuretyData.events.InsureeCredited({}, (error, event) => {
    logEvent(error, event, "INSUREE CREDITED");
  });

  flightSuretyData.events.PayInsuree({}, (error, event) => {
    logEvent(error, event, "PAY INSUREE");
  });
}

function logEvent(error, event, title) {
  if (error) console.log(error);
  else {
    console.log('----- EVENT -----');
    console.log(title);
    console.log(event.returnValues);
    console.log('-----------------');
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function isOperational() {
  let accts = await accounts;

  let status = await flightSuretyApp.methods
    .isOperational()
    .call({ from: accts[0] });

  return status;
}

async function setOperatingStatus(status) {
  let accts = await accounts;

  try {

    await flightSuretyApp.methods
      .setOperatingStatus(status)
      .send({ from: accts[0] });

    console.log(await isOperational());

    await registerFlight();

  } catch (error) {
    console.log(error)
  }

}

async function registerFlight() {
  let accts = await accounts;

  try {

    await fundAirline(accts[1]);

    await flightSuretyData.methods
      .registerFlight(accts[1], "101", 0)
      .send({ from: accts[0] });

    let flight101 = await flightSuretyData.methods.getFlight("101")
      .call({ from: accts[0] });

    console.log(flight101);

    await flightSuretyData.methods
      .registerFlight(accts[1], "102", 0)
      .send({ from: accts[0] });

    let flight102 = await flightSuretyData.methods.getFlight("102")
      .call({ from: accts[0] });

    console.log(flight102);

    await flightSuretyData.methods
      .registerFlight(accts[1], "103", 0)
      .send({ from: accts[0] });

    let flight103 = await flightSuretyData.methods.getFlight("103")
      .call({ from: accts[0] });

    console.log(flight103);


  } catch (error) {
    console.log(error)
  }

}

async function fundAirline(airline) {
  let minFunding = "10";

  let gasAmount = await flightSuretyApp.methods.fund(airline)
    .estimateGas({ from: airline, value: web3.utils.toWei(minFunding, "ether") });

  await flightSuretyApp.methods.fund(airline)
    .send({ from: airline, gas: gasAmount, value: web3.utils.toWei(minFunding, "ether") });
}

setOperatingStatus(true);
setOperatingStatus(false);

registerOracles();
listenForEvents();

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;
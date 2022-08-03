import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracles = [];

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
];

/****************************************************************
****************** FLIGHT SURETY APP EVENTS *******************
****************************************************************/

flightSuretyApp.events.Refund({}, (error, event) => {
  logEvent(error, event, "PASSENGER REFUNDED");
});
   
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
    const flight = {
      index: Number(event.returnValues.index),
      airline: event.returnValues.airline,
      flight: event.returnValues.flight,
      timestamp: event.returnValues.timestamp,
    };

    submitOracleResponsesForRequest(flight);

  } else {
    console.log(error)
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

function logEvent(error, event, title) {
  if (error) console.log(error);
  else {
    console.log('----- EVENT -----');
    console.log(title);
    console.log(event.returnValues);
    console.log('-----------------');
  }
}

web3.eth.getAccounts().then((returnedAddresses) => {
  web3.eth.defaultAccount = returnedAddresses[0];

  for (let i = 20; i < 40; i++) {
    console.log("Account: " + returnedAddresses[i]);
    registerOracle(returnedAddresses[i]);
  }

});

/****************************************************************
****************** SERVER FUNCTIONS *****************************
****************************************************************/

function getFlightStatus() {
  let randIndex = Math.floor(Math.random() * STATUS_CODES.length)
  return STATUS_CODES[randIndex];
}

// Server will loop through all registered oracles, identify those oracles for which
// the OracleRequest event applies, and respond by calling into FlightSuretyApp contract
// with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30),
// Late Technical (40), or Late Other (50)
function submitOracleResponsesForRequest(flight) {
  oracles.forEach(oracle => {
    let indexes = oracle.indexes.map(Number);

    if (indexes.indexOf(flight.index) >= 0) {
      let status = getFlightStatus();

      console.log("Submit status: ", flight.airline, flight.flight, flight.timestamp, status);

      flightSuretyApp.methods.submitOracleResponse(
        flight.index, flight.airline, flight.flight, flight.timestamp, status,
      )
        .send({ from: oracle.address, gas: 500000 })
        .then((r) => console.log("submitOracleResponse success"))
        .catch(e => console.log("submitOracleResponse error", e));
    }

  });
}

async function registerOracle(oracleAddress) {
  let gasAmount = await flightSuretyApp.methods.registerOracle().estimateGas({ from: oracleAddress, value: web3.utils.toWei("1", "ether") })
  console.log(gasAmount);  

  let response =       
      await flightSuretyApp.methods.registerOracle().send({ from: oracleAddress, gas: gasAmount, value: web3.utils.toWei("1", "ether") });
        
  let indexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracleAddress})
  
  console.log("oracle registered", response.from, indexes);

  oracles.push({
    "address": oracleAddress,
    "indexes": indexes,
  });

}

const app = express();
app.get('/api', (req, res) => {
  res.send({
    message: 'An API for use with your Dapp!'
  })
})

export default app;



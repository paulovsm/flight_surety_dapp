import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

        this.initialize(callback);
        this.owner = config.contractOwner;
        this.airlines = [];
        this.passengers = [];
        this.flights = {};
        this.oracleResponses = {};
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.flightSuretyApp.events.FlightStatusInfo()
                .on('data', event => {
                    console.log("FlightStatusInfo Event: ", event);

                    let flight = event.returnValues.flight;

                    this.oracleResponses[flight] = {
                        airline: event.returnValues.airline,
                        flight: event.returnValues.flight,
                        timestamp: event.returnValues.timestamp,
                        status: event.returnValues.status,
                    };

                })
                .on('changed', changed => console.log(changed))
                .on('error', err => console.log("ERROR:", err))
                .on('connected', str => console.log(str))

            var select = document.getElementById("selectPassenger");
            this.createSelectMenu(this.passengers, "selectPassenger");

            // First airline is registered when contract is deployed.
            this.setOperatingStatus(true, () => this.fundFirstAirline(this.airlines[0]));

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    setOperatingStatus(status, callback) {
        let self = this;
        self.flightSuretyApp.methods
            .setOperatingStatus(status, this.owner)
            .send({ from: self.owner }, callback);
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        this.oracleResponses = {};

        console.log("fetchFlightStatus for ", airline, flight, timestamp)

        self.flightSuretyApp.methods
            .fetchFlightStatus(airline, flight, timestamp)
            .send({ from: self.owner }, (error, result) => {
                let payload = {
                    airline: airline,
                    flight: flight,
                    timestamp: timestamp,
                };
                callback(error, payload);
            });
    }

    getFlights() {
        return this.flights;
    }

    async fundFirstAirline(airlineAddress) {
        let minFunding = "10";
        let self = this;

        firstAirline = await self.flightSuretyData.methods.getAirline(airlineAddress).call({ from: self.owner });
        console.log("firstAirline", firstAirline.airlineAddress, "funding =", this.web3.utils.fromWei(firstAirline.funding), "ETH");

        if (firstAirline.funding < this.web3.utils.toWei(minFunding, "ether")) {

            let gasAmount =  await self.flightSuretyApp.methods.fund(firstAirline.airlineAddress)
              .estimateGas({ from: firstAirline.airlineAddress, value: this.web3.utils.toWei(minFunding, "ether") });

            await self.flightSuretyApp.methods.fund(firstAirline.airlineAddress)
                .send({ from: firstAirline.airlineAddress, gas: gasAmount, value: this.web3.utils.toWei(minFunding, "ether") });

            console.log("first airline funded, registering flights");

            this.registerFlights(firstAirline.airlineAddress);

        } else {
            this.registerFlights(firstAirline.airlineAddress);
        }

    }

    async registerFlights(airline) {
        let self = this;
        let ts101 = new Date(2022, 08, 04, 10, 30);
        let ts102 = new Date(2022, 08, 04, 11, 30);
        let ts103 = new Date(2022, 08, 04, 12, 30);

        await self.flightSuretyApp.methods.registerFlight(airline, "101", ts101.getTime()).call({ from: self.owner });
        this.flights[101] = { airline: airline, flight: "101", timestamp: ts101.getTime(), status: 0 };
        console.log("registerFlight", airline, "101", ts101.getTime());

        await self.flightSuretyApp.methods.registerFlight(airline, "102", ts102.getTime()).call({ from: self.owner })
        this.flights[102] = { airline: airline, flight: "102", timestamp: ts102.getTime(), status: 0 };
        console.log("registerFlight", airline, "102", ts102.getTime());


        await self.flightSuretyApp.methods.registerFlight(airline, "103", ts103.getTime()).call({ from: self.owner })
        this.flights[103] = { airline: airline, flight: "103", timestamp: ts103.getTime(), status: 0 };
        console.log("registerFlight", airline, "103", ts103.getTime());

        let flightIds = Object.keys(this.flights);
        this.createSelectMenu(flightIds, "selectFlight");
    }

    createSelectMenu(options, elementId) {
        var select = document.getElementById(elementId);
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var el = document.createElement("option");
            el.textContent = opt;
            el.value = opt;
            select.appendChild(el);
        }
    }

    checkOracleResponse(flight, callback) {
        console.log(this.oracleResponses)
        callback(this.oracleResponses[flight]);
    }

    getPassengerInsuranceValue(passenger, callback) {
        let self = this;
        console.log(".getPassenger(passenger)", passenger);

        self.flightSuretyData.methods
            .getPassenger(passenger)
            .call({ from: self.owner }, (error, result) => {
                console.log(result);
                callback(error, result);
            });
    }

    async buyInsurance(passenger, airline, flightId, timestamp, insuranceAmount, callback) {
        let self = this;

        console.log("Buy Insurance", "passenger", passenger, "value", this.web3.utils.toWei(insuranceAmount, "ether"));

        let gasAmount = await self.flightSuretyApp.methods.buy(passenger, airline, flightId, timestamp,)
            .estimateGas({ from: passenger, value: this.web3.utils.toWei(insuranceAmount, "ether") });

        let txResult = await self.flightSuretyApp.methods.buy(passenger, airline, flightId, timestamp,)
            .send({ from: passenger, gas: gasAmount, value: this.web3.utils.toWei(insuranceAmount, "ether") });

        let tx = await this.web3.eth.getTransaction(txResult.tx);
        console.log(tx);

    }

    async withdrawCredit(passenger, callback) {
        let self = this;

        console.log("Withdraw Credit", passenger, passenger);

        balanceDue = await self.flightSuretyApp.methods.getBalanceDue(passenger).call({ from: self.owner });

        let txResult = await self.flightSuretyApp.methods.pay(passenger).send({ from: self.owner, value: balanceDue.toString(10) });

        let tx = await this.web3.eth.getTransaction(txResult.tx);
        console.log(tx);
    }

}
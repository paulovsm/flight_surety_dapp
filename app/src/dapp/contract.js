import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
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
                .on('connected', str => console.log("EVENT LISTENER: " + str))

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

        try {
            self.flightSuretyApp.methods
                .setOperatingStatus(status)
                .send({ from: self.owner }, callback);
        } catch (error) {
            console.log(error)
        }

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

        let firstAirline = await self.flightSuretyData.methods.getAirline(airlineAddress).call({ from: self.owner });
        console.log("firstAirline", firstAirline.airlineAddress, "funding =", this.web3.utils.fromWei(firstAirline.funding), "ETH");

        if (firstAirline.funding < this.web3.utils.toWei(minFunding, "ether")) {

            let gasAmount = await self.flightSuretyApp.methods.fund(firstAirline.airlineAddress)
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
        let ts101 = new Date(2022, 8, 4, 10, 30);
        let ts102 = new Date(2022, 8, 4, 11, 30);
        let ts103 = new Date(2022, 8, 4, 12, 30);

        let encondedTimestamp101 = this.web3.eth.abi.encodeParameter('uint256', ts101.getTime());
        await self.flightSuretyApp.methods.registerFlight(airline, "101", encondedTimestamp101).send({ from: self.owner });

        let flight101 = await self.flightSuretyData.methods.getFlight("101").call({ from: self.owner });
        this.flights[101] = { airline: airline, flight: "101", timestamp: encondedTimestamp101, status: 0 };
        console.log("registerFlight", flight101.airline, flight101.flightId, flight101.timestamp);

        let encondedTimestamp102 = this.web3.eth.abi.encodeParameter('uint256', ts102.getTime());
        await self.flightSuretyApp.methods.registerFlight(airline, "102", encondedTimestamp102).send({ from: self.owner })

        let flight102 = await self.flightSuretyData.methods.getFlight("102").call({ from: self.owner });
        this.flights[102] = { airline: airline, flight: "102", timestamp: encondedTimestamp102, status: 0 };
        console.log("registerFlight", flight102.airline, flight102.flightId, flight102.timestamp);

        let encondedTimestamp103 = this.web3.eth.abi.encodeParameter('uint256', ts103.getTime());
        await self.flightSuretyApp.methods.registerFlight(airline, "103", encondedTimestamp103).send({ from: self.owner })

        let flight103 = await self.flightSuretyData.methods.getFlight("103").call({ from: self.owner });
        this.flights[103] = { airline: airline, flight: "103", timestamp: encondedTimestamp103, status: 0 };
        console.log("registerFlight", flight103.airline, flight103.flightId, flight103.timestamp);

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
        console.log("Get Passenger Insurance", passenger);

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

        let tx = await this.web3.eth.getTransaction(txResult.transactionHash);
        console.log("Buy Insurance tx", tx);

        callback(null, { flight: flightId, timestamp: timestamp });

    }

    async withdrawCredit(passenger, callback) {
        let self = this;

        console.log("Withdraw Credit", passenger, passenger);

        let balanceDue = await self.flightSuretyApp.methods.getBalanceDue(passenger).call({ from: self.owner });

        let txResult = await self.flightSuretyApp.methods.pay(passenger).send({ from: self.owner, value: balanceDue.toString(10) });

        let tx = await this.web3.eth.getTransaction(txResult.transactionHash);
        
        console.log(tx);
    }

}
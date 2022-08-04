
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let operatingStatus = false;

let STATUS_CODES = {
    0: "STATUS_CODE_UNKNOWN",
    10: "STATUS_CODE_ON_TIME",
    20: "STATUS_CODE_LATE_AIRLINE",
    30: "STATUS_CODE_LATE_WEATHER",
    40: "STATUS_CODE_LATE_TECHNICAL",
    50: "STATUS_CODE_LATE_OTHER",
};

(async () => {

    let result = null;

    let flightLookup = {};

    let contract = new Contract('localhost', () => {

        operatingStatus = checkOperatingStatus(contract);

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightId = DOM.elid('selectFlight').value;
            let flight = flightLookup[flightId];

            // Write transaction
            contract.fetchFlightStatus(flight.airline, flight.flight, flight.timestamp, (error, result) => {
                displayOracles('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
        })

        DOM.elid('response-oracle').addEventListener('click', () => {
            let flightId = DOM.elid('selectFlight').value;
            let passenger = DOM.elid('selectPassenger').value;

            contract.checkOracleResponse(flightId, (result) => {
                var resultStr = "None";

                if (result) {
                    resultStr = result.flight + ' ' + result.timestamp + ' ' + STATUS_CODES[result.status];
                }

                displayOracleResponse('Oracle Response', 'FlightStatusInfo event', [{ label: 'Oracle Response:', value: resultStr }]);

                if (passenger) {
                    contract.getPassengerInsuranceValue(passenger, (error, result) => {
                        console.log(error, result);
                    });
                }
            });
        })

        DOM.elid('submit-buy').addEventListener('click', () => {
            let flightId = DOM.elid('selectFlight').value;
            let passenger = DOM.elid('selectPassenger').value;
            let flight = flightLookup[flightId];
            let insuranceAmt = DOM.elid('insurance-amt-eth').value;

            console.log("flight", flight.airline, flight.flight, flight.timestamp);
            console.log("insurance amount", insuranceAmt)

            contract.buyInsurance(passenger, flight.airline, flight.flight, flight.timestamp, insuranceAmt, (error, result) => {
                if (error) console.log("error", error);

                console.log("result", result);

                displayPurchase('Buy', 'Buy Insurance', [{ label: 'Buy Insurance Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
        })

        DOM.elid('toggle-operating-status').addEventListener('click', () => {
            console.log("setOperatingStatus", !operatingStatus)

            contract.setOperatingStatus(!operatingStatus, (error, result) => {
                checkOperatingStatus(contract);
            });
        })

        DOM.elid('load-flights').addEventListener('click', () => {
            let flights = contract.getFlights();
            let flightInfo = [];

            for (var flightId in flights) {
                const flight = flights[flightId];
                flightLookup[flightId] = flight;
                flightInfo.push({ label: flightId, value: "Airline: " + flight.airline + " time: " + flight.timestamp + " status: " + flight.status });
            }

            displayFlights("Flights", "Available Flights", flightInfo)
        })

        DOM.elid('load-passenger-value').addEventListener('click', () => {
            let passengerAddress = DOM.elid('selectPassenger').value;

            contract.getPassengerInsuranceValue(passengerAddress, (error, result) => {
                console.log(error, result);
            });
        })

        DOM.elid('withdraw').addEventListener('click', () => {
            let passengerAddress = DOM.elid('selectPassenger').value;

            contract.withdrawCredit(passengerAddress, (error, result) => {
                console.log(error, result);
            });
        })

    });


})();


function display(section_id, title, description, results) {
    let displayDiv = DOM.elid(section_id);
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.replaceChildren(section);

}

function checkOperatingStatus(contract) {
    // Read transaction
    contract.isOperational((error, result) => {
        console.log("isOperational", error, typeof (result), result);

        if (error) {
            console.log("isOperational error", error);
        }

        displayStatus('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
        operatingStatus = result;
    });
}

function displayFlights(title, description, results) {
    display("flights-wrapper", title, description, results);
}

function displayPurchase(title, description, results) {
    display("purchase-display-wrapper", title, description, results);
}

function displayStatus(title, description, results) {
    display("status-display-wrapper", title, description, results);
}

function displayOracles(title, description, results) {
    display("oracles-display-wrapper", title, description, results);
}

function displayOracleResponse(title, description, results) {
    display("oracles-response-wrapper", title, description, results);
}







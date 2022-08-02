
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        //await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, false, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setTestingMode(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it("Only existing airline may register a new airline until there are at least four airlines registered", async () => {
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);
        assert.strictEqual(firstAirline.airlineAddress, config.firstAirline, "First airline not registered");

        let approvingAirlines = [];

        try {
            await config.flightSuretyData.registerAirline(approvingAirlines, config.secondAirlineAddress);
        } catch (error) {
            assert.strictEqual(error.reason, 'Minimum consesus not met', "Expecting minimum consesus error");
        }

        approvingAirlines = [config.secondAirlineAddress];
        try {
            await config.flightSuretyData.registerAirline(approvingAirlines, config.secondAirlineAddress);
        } catch (error) {
            assert.strictEqual(error.reason, 'Airline not registered', "Didn't get expected error on register airline without existing airline");
        }

        approvingAirlines = [config.firstAirline];
        await config.flightSuretyData.registerAirline(approvingAirlines, config.secondAirlineAddress);
        const secondAirline = await config.flightSuretyData.getAirline(config.secondAirlineAddress);
        assert.strictEqual(secondAirline.airlineAddress, config.secondAirlineAddress, "Second airline not registered");

        approvingAirlines = [config.secondAirlineAddress]
        await config.flightSuretyData.registerAirline(approvingAirlines, config.thirdAirlineAddress);
        const thirdAirline = await config.flightSuretyData.getAirline(config.thirdAirlineAddress);
        assert.strictEqual(thirdAirline.airlineAddress, config.thirdAirlineAddress, "Third airline not registered");

        approvingAirlines = [config.thirdAirlineAddress]
        await config.flightSuretyData.registerAirline(approvingAirlines, config.fourthAirlineAddress);
        const fourthAirline = await config.flightSuretyData.getAirline(config.fourthAirlineAddress);
        assert.strictEqual(fourthAirline.airlineAddress, config.fourthAirlineAddress, "Fourth airline not registered");
        // Now have 4 airlines, now require 50% of exisiting airlines to approve    
    });

    it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {

        // Only 1 of 5 airlines approving (20%), should fail
        approvingAirlines = [config.fourthAirlineAddress];
        try {
            await config.flightSuretyData.registerAirline(approvingAirlines, config.fifthAirlineAddress);
        } catch (error) {
            assert.strictEqual(error.reason, 'Minimum consesus not met', "Expecting minimum consesus error");
        }

        // 2 of 4 (50%) approving, should succeed
        approvingAirlines = [config.thirdAirlineAddress, config.fourthAirlineAddress];
        await config.flightSuretyData.registerAirline(approvingAirlines, config.fifthAirlineAddress);
        const fifthAirline = await config.flightSuretyData.getAirline(config.fifthAirlineAddress);
        assert.strictEqual(fifthAirline.airlineAddress, config.fifthAirlineAddress, "Fifth airline failed to register with 50% consensus");
    });

    it("Airline can be registered, but does not participate in contract until it submits funding of 10 ether", async () => {
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);

        try {
            await config.flightSuretyData.getValidAirline(config.firstAirline);
        } catch (error) {
            assert(error.message.includes('Airline not at minimum funding'), error.message);
        }

        assert(firstAirline.funding === web3.utils.toWei("0", "ether"), "Airline funding should be 0 ETH");
        await config.flightSuretyApp.fund(firstAirline.airlineAddress, { from: firstAirline.airlineAddress, value: web3.utils.toWei("10", "ether") });

        const fundedFirstAirline = await config.flightSuretyData.getAirline(firstAirline.airlineAddress);
        assert.strictEqual(fundedFirstAirline.funding, web3.utils.toWei("10", "ether"), "Airline funding not set to 10 eth");

        const fundedValidFirstAirline = await config.flightSuretyData.getValidAirline(firstAirline.airlineAddress);
        assert.strictEqual(fundedValidFirstAirline.airlineAddress, firstAirline.airlineAddress, "First airline not valid");


    });


    it("Adds flights to funded airline", async () => {
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);

        try {
            await config.flightSuretyData.getValidAirline(config.firstAirline);
        } catch (error) {
            assert(error.message.includes('Airline not at minimum funding'), error.message);
        }

        await config.flightSuretyApp.registerFlight(firstAirline.airlineAddress, "101", new Date(2022, 08, 02, 10, 30).getTime())
        await config.flightSuretyApp.registerFlight(firstAirline.airlineAddress, "102", new Date(2022, 08, 02, 11, 30).getTime())
        await config.flightSuretyApp.registerFlight(firstAirline.airlineAddress, "103", new Date(2022, 08, 02, 12, 30).getTime())

        const flight101 = await config.flightSuretyData.getFlight("101");
        const flight102 = await config.flightSuretyData.getFlight("102");
        const flight103 = await config.flightSuretyData.getFlight("103");

        assert(flight101.flightId === "101");
        assert(flight102.flightId === "102");
        assert(flight103.flightId === "103");
    });

    it("Adds flights to unfunded airline", async () => {
        let secondAirline = await config.flightSuretyData.getAirline(config.secondAirlineAddress);

        try {
            await config.flightSuretyApp.registerFlight(secondAirline.airlineAddress, "201", new Date(2022, 08, 04, 10, 30).getTime())
        } catch (error) {
            assert(error.message.includes('Airline not at minimum funding'), error.message);
        }
    });


    it("Fund unfunded airline and add flights", async () => {
        let secondAirline = await config.flightSuretyData.getAirline(config.secondAirlineAddress);

        assert(secondAirline.funding === web3.utils.toWei("0", "ether"))

        await config.flightSuretyApp.fund(secondAirline.airlineAddress, { from: secondAirline.airlineAddress, value: web3.utils.toWei("10", "ether") });
        secondAirline = await config.flightSuretyData.getAirline(secondAirline.airlineAddress);
        assert(secondAirline.funding === web3.utils.toWei("10", "ether"))

        await config.flightSuretyApp.registerFlight(secondAirline.airlineAddress, "201", new Date(2022, 08, 04, 10, 30).getTime())
        await config.flightSuretyApp.registerFlight(secondAirline.airlineAddress, "202", new Date(2022, 08, 04, 11, 30).getTime())
        await config.flightSuretyApp.registerFlight(secondAirline.airlineAddress, "203", new Date(2022, 08, 04, 12, 30).getTime())

        const flight201 = await config.flightSuretyData.getFlight("201");
        const flight202 = await config.flightSuretyData.getFlight("202");
        const flight203 = await config.flightSuretyData.getFlight("203");

        assert(flight201.flightId === "201");
        assert(flight202.flightId === "202");
        assert(flight203.flightId === "203");

    });

    it("Passengers may pay up to 1 ether for purchasing flight insurance", async () => {
        const insuranceValueEth1 = "1";
        const insuranceValueEth2 = "0.5";
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);

        await testBuyInsurance(config.passengerAddress1, firstAirline.airlineAddress, "101", new Date(2022, 08, 02, 10, 30).getTime(), insuranceValueEth1);
        await testBuyInsurance(config.passengerAddress2, firstAirline.airlineAddress, "101", new Date(2022, 08, 02, 10, 30).getTime(), insuranceValueEth2);

        const flightPassengers = await config.flightSuretyData.getFlightPassengers(
            firstAirline.airlineAddress,
            "101",
            new Date(2022, 08, 02, 10, 30).getTime()
        );
        await testGetPassenger(
            flightPassengers[0],
            config.passengerAddress1,
            insuranceValueEth1,
            "0",
        );
        await testGetPassenger(
            flightPassengers[1],
            config.passengerAddress2,
            insuranceValueEth2,
            "0",
        );
    });

    it("Passenger may purchase max 1 ether insurance, over amount refunded", async () => {
        const insuranceValueEthRequested = "1.5";
        const expectedInsuranceValueEth = "1";
        let secondAirline = await config.flightSuretyData.getAirline(config.secondAirlineAddress);

        await testBuyInsurance(config.passengerAddress1, secondAirline.airlineAddress, "201", new Date(2022, 08, 04, 10, 30).getTime(), insuranceValueEthRequested);

        const flightPassengers = await config.flightSuretyData.getFlightPassengers(
            secondAirline.airlineAddress,
            "201",
            new Date(2022, 08, 04, 10, 30).getTime()
        );
        await testGetPassenger(
            flightPassengers[0],
            config.passengerAddress1,
            expectedInsuranceValueEth,
            "0",
        );
    });

    it("Passenger may not purchase insurance for non-existent flight", async () => {
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);
        var exceptionCaught = false;

        try {
            await config.flightSuretyApp.buy(
                config.passengerAddress1,
                firstAirline.airlineAddress,
                "999",
                Date.now(),
                { from: config.passengerAddress1, value: web3.utils.toWei("1", "ether") },
            );
        }
        catch (e) {
            console.log(e.message);
            exceptionCaught = true;
        }

        assert(exceptionCaught, "Did not have expected exception");
    });

    it("If flight is delayed due to airline fault, passenger receives credit of 1.5X the amount they paid ", async () => {
        let firstAirline = await config.flightSuretyData.getAirline(config.firstAirline);
        let secondAirline = await config.flightSuretyData.getAirline(config.secondAirlineAddress);
        const expectedInsuranceValueEth1 = "1";
        const expectedPayoutCreditEth1 = "1.5";
        const expectedInsuranceValueEth2 = "0.5";
        const expectedPayoutCreditEth2 = "0.75";
        const expectedInsuranceValueEth3 = "1";
        const expectedPayoutCreditEth3 = "1.5";

        await config.flightSuretyData.creditInsurees(
            firstAirline.airlineAddress,
            "101",
            new Date(2022, 08, 02, 10, 30).getTime(),
        );
        const flightPassengers101 = await config.flightSuretyData.getFlightPassengers(
            firstAirline.airlineAddress,
            "101",
            new Date(2022, 08, 02, 10, 30).getTime()
        );
        await testGetPassenger(
            flightPassengers101[0],
            config.passengerAddress1,
            expectedInsuranceValueEth1,
            expectedPayoutCreditEth1,
        );
        await testGetPassenger(
            flightPassengers101[1],
            config.passengerAddress2,
            expectedInsuranceValueEth2,
            expectedPayoutCreditEth2,
        );

        const balanceDue1 = await config.flightSuretyApp.getBalanceDue(flightPassengers101[0]);
        assert(balanceDue1.toString(10) === web3.utils.toWei(expectedPayoutCreditEth1, "ether"), "payoutCredit not set correctly");

        const balanceDue2 = await config.flightSuretyApp.getBalanceDue(flightPassengers101[1]);
        assert(balanceDue2.toString(10) == web3.utils.toWei(expectedPayoutCreditEth2, "ether"), "payoutCredit not set correctly");


        const flightPassengers201 = await config.flightSuretyData.getFlightPassengers(
            secondAirline.airlineAddress,
            "201",
            new Date(2022, 08, 04, 10, 30).getTime()
        );
        // same passenger1 on different flight
        await testGetPassenger(
            flightPassengers201[0],
            config.passengerAddress1,
            expectedInsuranceValueEth3,
            expectedPayoutCreditEth3,
        );

        await testWithdraw(config.passengerAddress1, expectedPayoutCreditEth1);
        await testWithdraw(config.passengerAddress2, expectedPayoutCreditEth2);
        // passenger 1 already withdrew balance
        await testWithdraw(config.passengerAddress1, "0");
    });

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    async function testBuyInsurance(passenger, airline, flightId, timestamp, ethValue) {
        const txResult = await config.flightSuretyApp.buy(
            passenger,
            airline,
            flightId,
            timestamp,
            { from: passenger, value: web3.utils.toWei(ethValue, "ether") },
        );
        const tx = await web3.eth.getTransaction(txResult.tx);
        assert(tx.value === web3.utils.toWei(ethValue, "ether"), "Transaction failed");
    }

    async function testWithdraw(passenger, expectedEthValue) {
        const balanceDue = await config.flightSuretyApp.getBalanceDue(passenger);
        const txResult = await config.flightSuretyApp.pay(
            passenger,
            { from: config.owner, value: balanceDue.toString(10) });
        const tx = await web3.eth.getTransaction(txResult.tx);
        assert(tx.value === web3.utils.toWei(expectedEthValue, "ether"), "Transaction failed");
    }

    async function testGetPassenger(
        passengerAddress,
        expectedPassengerAddress,
        expectedInsuranceEthValue,
        expectedPayoutCreditEthValue,
    ) {
        const passenger = await config.flightSuretyData.getPassenger(passengerAddress);
        assert(passenger.passengerAddress === expectedPassengerAddress);
        assert(passenger.insuranceValue === web3.utils.toWei(expectedInsuranceEthValue, "ether"), "Invalid insurance value");
        assert(passenger.payoutCredit === web3.utils.toWei(expectedPayoutCreditEthValue, "ether"), "Invalid payout credit " + passenger.payoutCredit + " expected " + web3.utils.toWei(expectedPayoutCreditEthValue, "ether"));
    }


});

# Ethereum FlightSurety Dapp

Ethereum FlightSurety Dapp is a flight delay insurance for passengers.

- Managed as a collaboration between multiple airlines
- The passengers purchase insurance prior to flight
- If flight is delayed due to airline fault, passengers are paid 1.5X the amount they paid for the insurance
- Oracles provide flight status information
- The smart contract is upgradable
- The smart contract securely requests and receives information from oracles
- Airlines registration implements multi-party consensus

### Libraries Version
>
    Truffle v5.5.21 (core: 5.5.21)
    Ganache v7.2.0
    Solidity v0.5.16 (solc-js)
    Node v16.14.2
    Web3.js v1.7.4

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`cd app`

`npm install`

`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./app/test/flightSurety.js`

`truffle test ./app/test/oracles.js`

To use the dapp:

`cd app`

`truffle migrate`

`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`cd app`

`npm run server`

`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`cd app`
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)

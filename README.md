# Midnight Auction DApp PoC

The repository contains an example `Auction DApp` used to showcase Midnight integration.

The Auction DApp is implemented as a Command-Line Interface (CLI) application, allowing users to interact with the smart contract via terminal commands.

## Requirements

Follow the [Midnight Prerequisites for part 2](https://docs.midnight.network/develop/tutorial/building/prereqs) installation steps to:
1. Install `nvm` (Node Version Manager)
2. Install `compactc`, the Midnight Compact compiler
3. Optionally: install the VSCode extension for the Compact language

## Compiling the DApp
1. Clone the repository

```shell
git clone https://github.com/bvoiturier/midnight-poc.git
```

2. Configure NVM for the project

```shell
cd midnight-poc
nvm install
corepack enable
yarn
```

3. Build the example project

```shell
cd examples/bboard-tutorial
npx turbo build
```

## Run the DApp on the testnet
1. Start the local Proof Server

```shell
docker run -p 6300:6300 midnightnetwork/proof-server -- 'midnight-proof-server --network testnet'
```

2. Start the CLI DApp for seller (Alice) and bidder (Bob)

```shell
cd bboard-cli
yarn testnet-remote alice
yarn testnet-remote bob
```

3. Provision new wallets with some tDUST

To interact with the Auction DApp, you’ll need to provision the wallets with tDUST, a testnet token used for transactions within the Midnight ecosystem.

To do so, follow the Midnight [Token Acquisistion](https://docs.midnight.network/develop/tutorial/using/faucet) documentation.


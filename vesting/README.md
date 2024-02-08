# Vesting

This contract enables gradual token vesting over time.

## Installation

Install dependencies

```bash
yarn install
```

## Deployment

Copy .env.example to .env and fill in params

```bash
cp .env.example .env
```

Deploy

```bash
yarn hardhat run scripts/deploy.js
```

## Test

Run tests

```bash
yarn hardhat test
```

Run test coverage

```bash
yarn hardhat coverage
```

## Functional Requirements

### Project Purpose
The purpose of this project is to implement a vesting smart contract on the Polygon blockchain. This contract enables the gradual release of tokens to beneficiaries over time, providing a mechanism for controlled distribution of assets.

### Project Features
1. Vesting Schedule: Tokens are minted to owner.
2. Maximum Limit: There is a maximum limit on the number of tokens that can be minted in each vesting period to prevent excessive token release.
3. Owner Control: The contract owner has the authority to initiate token minting and stop the vesting process if necessary.

### Project Business Logic
- The contract calculates the amount of tokens that can be minted based on the elapsed time since the last update and the predefined vesting duration.
- Tokens are minted only if the requested amount is within the limit for the current vesting period.
- The owner has the ability to stop the vesting process, preventing further token minting.

### Use Cases
1. Tokens Vesting: Owner can mint up to MAX_MINTABLE_AMOUNT tokens per DURATION. Left over tokens amount rolls over to the next vesting period.

### User Roles and Authorizations
1. Owner: The owner of the contract has the authority to mint tokens, stop the vesting process, and manage contract parameters.

## Technical Requirements

### Project Components
- Contract: `Vesting` smart contract implementing the vesting logic.
- Key Functions: `mint` function for token minting, `stop` function for stopping the vesting process.
- State Variables: `owner`, `token`, `lastUpdated`, `mintableAmount`, `isStopped`.

### Technologies Used
- Solidity: Programming language for writing smart contracts on the Polygon blockchain.
- Polygon: Blockchain platform for deploying and executing smart contracts.
- ERC20: Token standard used for fungible tokens on the Polygon blockchain.

### Architectural Design
The architecture consists of a single smart contract (`Vesting`) deployed on the Polygon blockchain. The contract interacts with an ERC20 token contract (`IERC20Mintable`) to mint tokens. The owner of the contract has privileged access to key functions such as token minting and stopping the vesting process.

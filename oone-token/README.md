# OONE Token

OONE token facilitates decentralized finance transactions within a specific ecosystem. It provides minting, burning, and ownership functionality, conforming to the ERC20 standard.

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
The OONE token aims to facilitate decentralized finance (DeFi) transactions within a specific ecosystem. It serves as a utility token providing holders with access to various features and services within the ecosystem.

### Project Features
1. Minting: The owner of the contract can mint new OONE tokens.
2. Burning: Token holders can burn their tokens, reducing the total supply.
3. Ownership: The contract includes ownership functionality allowing the owner to manage token distribution.
4. ERC20 Compatibility: The token conforms to the ERC20 standard, ensuring interoperability with other ERC20-compliant tokens and platforms.

### Project Business Logic
The business logic revolves around token issuance, transfer, and burning:
- Tokens can only be minted by the contract owner.
- Token holders can transfer tokens to other addresses.
- Token holders can burn their own tokens, reducing the total supply.

### Use Cases
1. **Token Distribution**: The owner mints tokens and distributes them to users or stakeholders.
2. **Transaction**: Users transfer OONE tokens to other addresses for transactions within the ecosystem.
3. **Token Burning**: Token holders burn their tokens to reduce the total supply, potentially increasing the value of remaining tokens.

### Roles and Authorizations
- **Owner**: Has the authority to mint new tokens and manage the contract.
- **Token Holders**: Can transfer tokens and burn their own tokens.

## Technical Requirements

### Project Components
- **Contract**: OoneToken.sol containing the OONE token contract code.
- **Key Functions**: `constructor` for contract initialization, `mint` for token minting, and inherited functions for burning and ownership management.
- **State Variables**: Including token name, symbol, total supply, and balances.

### Technologies Used
- **Solidity**: Programming language for writing smart contracts on the Ethereum blockchain.
- **OpenZeppelin**: Library for secure smart contract development, providing ERC20 and Ownable implementations.

### Architectural Design
The contract follows a simple architecture:
- **OoneToken Contract**: Inherits from ERC20, ERC20Burnable, and Ownable contracts.
- **ERC20**: Provides standard functions and events for ERC20-compliant tokens.
- **ERC20Burnable**: Adds burning functionality to the token contract.
- **Ownable**: Implements ownership functionality allowing the contract owner to manage the contract.
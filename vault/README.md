# Vault

Smart contract for managing token balances and rewards distribution.

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
The purpose of the Vault smart contract is to serve as a secure and automated system for managing and distributing rewards in the form of ERC20 tokens (OONE and USDT).

### Project Features
1. **Token Management**: The Vault contract manages the balances of OONE and USDT tokens.
2. **Rewards Distribution**: Facilitates the distribution of rewards to rewards distributor contracts.
3. **Balances Refill**: Refills balances of addresses with Native tokens when they fall below a certain threshold.
4. **Access Control**: Implements role-based access control to regulate who can perform specific actions within the contract.
5. **Upgradeability**: Supports contract upgradability to allow for future enhancements and bug fixes.

### Project Business Logic
The business logic of the Vault contract revolves around maintaining adequate token balances in rewards distributor contracts to ensure continuous and efficient distribution of rewards to users. It enforces access control to prevent unauthorized operations and provides mechanisms for adjusting parameters such as refill amount and minimum working balance.

### Use Cases
1. **Rewards Distribution**: Transfer OONE/USDT tokens to rewards distributor contracts.
2. **Admin Management**: Administrators control the settings of the Vault contract, such as rewards distributors and refill parameters.
3. **Balances Refill**: The contract refills balances of addresses with Native tokens when they fall below a certain threshold.

### Roles and Authorizations
1. **Default Admin**: Can set rewards distributors, minimum working balance, and refill amount.
2. **Refill Balance Role**: Authorized to refill balances in rewards distributor contracts.

## Technical Requirements

### Project Components
- **Contract**: Vault.sol - The main smart contract managing token balances and rewards distribution.
- **Key Functions**:
  - `initialize`: Initializes the contract with initial parameters.
  - `setRewardsDistributorOone`, `setRewardsDistributorUsdt`: Set rewards distributor contracts.
  - `setMinWorkingBalance`, `setRefillAmount`: Set minimum working balance and refill amount parameters.
  - `refillRewardsDistributorOone`, `refillRewardsDistributorUsdt`: Refill rewards distributor balances.
  - `refillBalances`: Automated refill of balances for multiple addresses.
- **State Variables**:
  - `ooneToken`, `usdtToken`: ERC20 token interfaces.
  - `rewardsDistributorOone`, `rewardsDistributorUsdt`: Addresses of rewards distributor contracts.
  - `minWorkingBalance`, `refillAmount`: Parameters for refill logic.

### Technologies Used
- **Solidity**: Programming language for smart contract development.
- **OpenZeppelin**: Provides standardized, secure smart contract libraries.
- **Polygon**: Blockchain platform for deploying and executing smart contracts.
- **UUPSUpgradeable**: Pattern for upgradable smart contracts.

### Architectural Design
The Vault smart contract follows a modular architecture:
- **Access Control**: Implemented using OpenZeppelin's AccessControlUpgradeable.
- **Token Management**: Utilizes SafeERC20 library for safe token transfers.
- **Upgradeability**: Inherits from UUPSUpgradeable for contract upgradability.

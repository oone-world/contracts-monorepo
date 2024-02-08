# Rewards Distributor

The Rewards Distributor smart contract facilitates the distribution of rewards to users and allows for the management of reward balances.

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
The purpose of the project is to facilitate the distribution of rewards to users.

### Project Features
- Ability to send rewards to users.
- Ability to refill the rewards balance for users.
- Flexibility to change the rewards token contract address.

### Project Business Logic
- The contract owner can manage the rewards token and roles.
- Authorized roles can send rewards and refill user balances.

### Use Cases
1. **Sending Rewards**
   - Send Rewards manager sends rewards to users, but no more than user's balance.
2. **Refilling Balances**:
   - Vault manager refills the rewards balance for users.

### Roles and Authorizations
- **Admin**: Can change the rewards token address and manage roles.
- **Send Rewards Role**: Can send rewards to users.
- **Vault Role**: Can refill user balances.

## Technical Requirements

### Project Components
- **Contract**: RewardsDistributor
- **Key Functions**:
  - `initialize`: Initializes the contract.
  - `setRewardsToken`: Allows changing the rewards token address.
  - `sendRewards`: Sends rewards to users.
  - `refillBalance`: Refills user balances.
- **State Variables**:
  - `SEND_REWARDS_ROLE` and `VAULT_ROLE`: Role identifiers.
  - `rewardsToken`: ERC20 token used for rewards.
  - `userBalance`: Mapping of user balances.

### Technologies Used
- Solidity: Programming language for smart contracts.
- OpenZeppelin: Library for secure smart contract development.
- Polygon: Blockchain platform for deploying smart contracts.

### Architectural Design
The contract is designed using the upgradeable pattern provided by OpenZeppelin. It utilizes AccessControlUpgradeable for role-based access control and SafeERC20 for secure ERC20 token transfers.

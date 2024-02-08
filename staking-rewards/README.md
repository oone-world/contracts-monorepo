# Staking Rewards

A contract for staking tokens and earning rewards over time.

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
The purpose of this project is to create a decentralized staking rewards platform where users can stake their tokens and earn rewards over time. This incentivizes token holders to participate in the project's ecosystem and contributes to the overall liquidity and stability of the token.

### Project Features
1. Staking: Users can stake their tokens into the platform.
2. Reward Distribution: Rewards are distributed to users based on their staked amount and the duration they have been staking.
3. Reward Claiming: Users can claim their earned rewards at any time.
4. Withdrawal: Users can withdraw their staked tokens along with their earned rewards.
5. Pausing: The contract can be paused and unpaused by the admin in case of emergencies or maintenance.
6. Token Recovery: The admin can recover accidentally sent ERC20 tokens other than the staking token.
7. Upgradeability: The contract is designed to be upgradeable to incorporate future enhancements or bug fixes.

### Project Business Logic
1. Users stake their tokens into the contract, locking them for a certain period.
2. Rewards are continuously accrued based on the staked amount and time duration.
3. Users can claim their rewards at any time, and they will be credited to their wallet immediately.
4. Staked tokens can be withdrawn by users at any time, along with their earned rewards.

### Use Cases
1. User A wants to earn passive income from their tokens. They stake their tokens into the contract and periodically claim their rewards.
2. User B decides to exit the platform. They withdraw their staked tokens along with their earned rewards.
3. Admin needs to perform maintenance on the platform. They pause the contract temporarily to prevent any unintended interactions.

### Roles and Authorizations
1. Admin: The admin has the authority to manage the contract, including setting rewards, pausing/unpausing, and recovering tokens.
2. Staking Role: Users with the staking role can notify the contract about the amount of rewards to be distributed.

## Technical Requirements

### Project Components
1. Contract: The main smart contract containing the staking and rewards logic.
2. Key Functions:
   - `stake`: Allows users to stake tokens into the contract.
   - `withdraw`: Allows users to withdraw their staked tokens along with their earned rewards.
   - `getReward`: Allows users to claim their earned rewards.
   - `notifyRewardAmount`: Allows the admin to specify the amount of rewards to be distributed.
   - `recoverERC20`: Allows the admin to recover accidentally sent ERC20 tokens.
3. State Variable Descriptions:
   - `rewardsToken`: Address of the ERC20 token used for rewards.
   - `stakingToken`: Address of the ERC20 token users stake.
   - `periodFinish`: Timestamp indicating when the reward period ends.
   - `rewardRate`: Rate at which rewards are distributed per second.
   - `rewardsDuration`: Duration of each rewards period.
   - `lastUpdateTime`: Timestamp of the last time rewards were updated.
   - `rewardPerTokenStored`: Accumulated reward per token.
   - `userRewardPerTokenPaid`: Mapping to track the last reward per token paid to each user.
   - `rewards`: Mapping to track the rewards earned by each user.
   - `_totalSupply`: Total amount of tokens staked in the contract.
   - `_balances`: Mapping to track the balance of tokens staked by each user.

### Technologies Used
1. Solidity: Programming language used for writing smart contracts.
2. OpenZeppelin: Library used for secure smart contract development.
3. Ethereum: Blockchain platform where the smart contract will be deployed.

### Architectural Design
The contract follows an upgradeable architecture using OpenZeppelin's UUPSUpgradeable pattern. It leverages access control through the AccessControlUpgradeable library to manage admin privileges. The contract is designed to be pausable using the PausableUpgradeable library to handle emergency situations or maintenance. Additionally, it incorporates a recovery mechanism to prevent loss of accidentally sent tokens. The contract interacts with ERC20 tokens for staking and rewards distribution.

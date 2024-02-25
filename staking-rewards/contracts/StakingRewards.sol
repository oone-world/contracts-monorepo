// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/**
 * @title StakingRewards
 * @dev A contract for staking tokens and earning rewards over time.
 */
contract StakingRewards is Initializable, UUPSUpgradeable, AccessControlUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20;

     // Role identifier for users who can notify about the start of staking.
    bytes32 public constant START_STAKING_ROLE = keccak256("START_STAKING");

    // State variables

    // The ERC20 token used for rewards.
    IERC20 public rewardsToken;

    // The ERC20 token users stake.
    IERC20 public stakingToken;

    // Timestamp when the reward period ends.
    uint256 public periodFinish;

    // Rate at which rewards are distributed per second.
    uint256 public rewardRate;

    // Duration of each rewards period.
    uint256 public rewardsDuration;

    // Timestamp of the last time rewards were updated.
    uint256 public lastUpdateTime;

    // Accumulated reward per token.
    uint256 public rewardPerTokenStored;

    // Mapping to track the last reward per token paid to each user.
    mapping(address => uint256) public userRewardPerTokenPaid;

    // Mapping to track the rewards earned by each user.
    mapping(address => uint256) public rewards;

    // Total amount of tokens staked in the contract.
    uint256 private _totalSupply;

    // Mapping to track the balance of tokens staked by each user.
    mapping(address => uint256) private _balances;

    // Events

    /**
     * @dev Emitted when rewards are added to the contract.
     * @param reward The amount of rewards added.
     */
    event RewardAdded(uint256 reward);

    /**
     * @dev Emitted when a user stakes tokens.
     * @param user The address of the user who staked tokens.
     * @param amount The amount of tokens staked.
     */
    event Staked(address indexed user, uint256 amount);

    /**
     * @dev Emitted when a user withdraws tokens.
     * @param user The address of the user who withdrew tokens.
     * @param amount The amount of tokens withdrawn.
     */
    event Withdrawn(address indexed user, uint256 amount);

    /**
     * @dev Emitted when a user claims rewards.
     * @param user The address of the user who claimed rewards.
     * @param reward The amount of rewards claimed.
     */
    event RewardPaid(address indexed user, uint256 reward);

    /**
     * @dev Emitted when the rewards duration is updated.
     * @param newDuration The new rewards duration.
     */
    event RewardsDurationUpdated(uint256 newDuration);

    /**
     * @dev Emitted when the admin recovers tokens.
     * @param token The address of the token being recovered.
     * @param amount The amount of tokens being recovered.
     */
    event Recovered(address token, uint256 amount);

    // Constructor and initializer

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @dev Initializes the contract with the specified parameters.
     * @param _owner The address of the contract owner.
     * @param _rewardsToken The address of the ERC20 token used for rewards.
     * @param _stakingToken The address of the ERC20 token used for staking.
     */
    function initialize(
        address _owner,
        address _rewardsToken,
        address _stakingToken
    ) initializer public {
        rewardsToken = IERC20(_rewardsToken);
        stakingToken = IERC20(_stakingToken);
        periodFinish = 0;
        rewardRate = 0;
        rewardsDuration = 30 days;

        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        __ReentrancyGuard_init();
        __Pausable_init();
    }

    // Views

    /**
     * @dev Returns the total amount of tokens staked in the contract.
     * @return The total staked supply.
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the balance of the specified account.
     * @param account The address of the account to query.
     * @return The balance of the account.
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Returns the last time rewards were applicable.
     * @return The last time rewards were applicable.
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /**
     * @dev Returns the reward per token.
     * @return The reward per token.
     */
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored + (lastTimeRewardApplicable() - lastUpdateTime) * rewardRate * 1e18 / _totalSupply;
    }

    /**
     * @dev Returns the amount of rewards earned by the specified account.
     * @param account The address of the account to query.
     * @return The amount of rewards earned by the account.
     */
    function earned(address account) public view returns (uint256) {
        return _balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account]) / 1e18 + rewards[account];
    }

    /**
     * @dev Returns the reward for the entire duration.
     * @return The reward for the entire duration.
     */
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * rewardsDuration;
    }

    // Mutative functions

    /**
     * @dev Allows a user to stake tokens.
     * @param amount The amount of tokens to stake.
     */
    function stake(uint256 amount) external nonReentrant whenNotPaused() updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply + amount;
        _balances[msg.sender] = _balances[msg.sender] + amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @dev Allows a user to withdraw staked tokens.
     * @param amount The amount of tokens to withdraw.
     */
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = _balances[msg.sender] - amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Allows a user to claim rewards.
     */
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardsToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @dev Allows a user to withdraw staked tokens and claim rewards.
     */
    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    // Restricted functions

    /**
     * @dev Notifies the contract about the amount of rewards to be distributed.
     * @param reward The amount of rewards to be distributed.
     */
    function notifyRewardAmount(uint256 reward) external onlyRole(START_STAKING_ROLE) updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint balance = rewardsToken.balanceOf(address(this));
        require(rewardRate <= balance / rewardsDuration, "Provided reward too high");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    /**
     * @dev Allows the admin to recover accidentally sent ERC20 tokens other than the staking token.
     * @param tokenAddress The address of the ERC20 token to recover.
     * @param tokenAmount The amount of tokens to recover.
     */
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(stakingToken), "Cannot withdraw the staking token");
        IERC20(tokenAddress).safeTransfer(msg.sender, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /**
     * @dev Sets the rewards duration.
     * @param _rewardsDuration The new rewards duration.
     */
    function setRewardsDuration(uint256 _rewardsDuration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            block.timestamp > periodFinish,
            "Previous rewards period must be complete before changing the duration for the new period"
        );
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(rewardsDuration);
    }

    /**
     * @dev Sets the contract's pause state.
     * @param _paused The new pause state.
     */
    function setPaused(bool _paused) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_paused == paused()) {
            return;
        }
        
        if (_paused) {
            _pause();
        } else {
            _unpause();
        }
    }

    // Internal functions

    /**
     * @dev Authorizes an upgrade.
     * @param newImplementation The address of the new implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // External functions

    /**
     * @dev Modifier to update rewards when called.
     * @param account The address of the account to update rewards for.
     */
    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
}

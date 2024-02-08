// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Rewards Distributor
 * @dev The Rewards Distributor smart contract facilitates the distribution of rewards
 * to users and allows for the management of reward balances.
 */
contract RewardsDistributor is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    // Role identifier for sending rewards to users.
    bytes32 public constant SEND_REWARDS_ROLE = keccak256("SEND_REWARDS_ROLE");

    // Role identifier for managing the vault and refilling user balances.
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");

    // Address of the ERC20 token used for rewards.
    IERC20 public rewardsToken;

    // Mapping to store the reward balances of users.
    mapping(string => uint256) public userBalance;

    /**
     * @dev Emitted when rewards are sent to a user.
     * @param user Identifier of the user.
     * @param token Address of the token used for rewards.
     * @param amount Amount of rewards sent.
     * @param recipient Address of the recipient.
     */
    event RewardsSent(string user, address token, uint256 amount, address indexed recipient);

    /**
     * @dev Emitted when the rewards balance for a user is refilled.
     * @param sender Address of the sender.
     * @param user Identifier of the user.
     * @param token Address of the token used for rewards.
     * @param amount Amount of rewards refilled.
     */
    event RewardsRefilled(address sender, string user, address token, uint256 amount);

    /**
     * @dev Emitted when the rewards token address is changed.
     * @param oldRewardsToken Address of the old rewards token.
     * @param newRewardsToken Address of the new rewards token.
     */
    event RewardsTokenChanged(address oldRewardsToken, address newRewardsToken);

    /**
     * @dev Initializes the contract with the rewards token address and sets the owner.
     * @param _rewardsTokenAddress The address of the rewards token.
     * @param _owner The address of the owner who has administrative privileges.
     */
    function initialize(
        address _rewardsTokenAddress,
        address _owner
    ) initializer public {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);

        rewardsToken = IERC20(_rewardsTokenAddress);
    }

    /**
     * @dev Allows the contract owner to change the rewards token address.
     * Only callable by the contract owner with the DEFAULT_ADMIN_ROLE.
     * @param _rewardsTokenAddress The new address of the rewards token.
     */
    function setRewardsToken(address _rewardsTokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsTokenChanged(address(rewardsToken), _rewardsTokenAddress);
        
        rewardsToken = IERC20(_rewardsTokenAddress);
    }

    /**
     * @dev Sends rewards to a user.
     * Only callable by the roles with the SEND_REWARDS_ROLE.
     * @param _user The identifier of the user receiving rewards.
     * @param _amount The amount of rewards to send.
     * @param _recipient The address of the recipient.
     */
    function sendRewards(string calldata _user, uint256 _amount, address _recipient) external onlyRole(SEND_REWARDS_ROLE) {
        require(address(rewardsToken) != address(0), 'Sending rewards is paused');
        require(userBalance[_user] >= _amount, 'Not enough user balance');

        rewardsToken.safeTransfer(_recipient, _amount);
        userBalance[_user] -= _amount;
        
        emit RewardsSent(_user, address(rewardsToken), _amount, _recipient);
    }

    /**
     * @dev Refills the rewards balance for a user.
     * Only callable by the roles with the VAULT_ROLE.
     * @param _user The identifier of the user.
     * @param _amount The amount of rewards to refill.
     */
    function refillBalance(string calldata _user, uint256 _amount) external onlyRole(VAULT_ROLE) {
        require(address(rewardsToken) != address(0), 'Refilling is paused');

        rewardsToken.safeTransferFrom(msg.sender, address(this), _amount);
        userBalance[_user] += _amount;
        
        emit RewardsRefilled(msg.sender, _user, address(rewardsToken), _amount);
    }

    /**
     * @dev Authorizes upgrade for the contract owner.
     * Only callable by the contract owner with the DEFAULT_ADMIN_ROLE.
     * @param newImplementation The address of the new implementation.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

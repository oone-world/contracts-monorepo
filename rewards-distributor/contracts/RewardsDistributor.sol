// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsDistributor is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant SEND_REWARDS_ROLE = keccak256("SEND_REWARDS_ROLE");
    bytes32 public constant VAULT_ROLE = keccak256("VAULT_ROLE");
    
    IERC20 public rewardsToken;

    mapping(string => uint256) public userBalance;

    event RewardsSent(string user, address token, uint256 amount, address indexed recipient);
    event RewardsRefilled(address sender, string user, address token, uint256 amount);
    event RewardsTokenChanged(address oldRewardsToken, address newRewardsToken);

    function initialize(
        address _rewardsTokenAddress,
        address _owner
    ) initializer public {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);

        rewardsToken = IERC20(_rewardsTokenAddress);
    }

    function setRewardsToken(address _rewardsTokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsTokenChanged(address(rewardsToken), _rewardsTokenAddress);
        
        rewardsToken = IERC20(_rewardsTokenAddress);
    }

    function sendRewards(string calldata _user, uint256 _amount, address _recipient) external onlyRole(SEND_REWARDS_ROLE) {
        require(address(rewardsToken) != address(0), 'Sending rewards is paused');
        require(userBalance[_user] >= _amount, 'Not enough user balance');

        rewardsToken.safeTransfer(_recipient, _amount);
        userBalance[_user] -= _amount;
        
        emit RewardsSent(_user, address(rewardsToken), _amount, _recipient);
    }

    function refillBalance(string calldata _user, uint256 _amount) external onlyRole(VAULT_ROLE) {
        require(address(rewardsToken) != address(0), 'Refilling is paused');

        rewardsToken.safeTransferFrom(msg.sender, address(this), _amount);
        userBalance[_user] += _amount;
        
        emit RewardsRefilled(msg.sender, _user, address(rewardsToken), _amount);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

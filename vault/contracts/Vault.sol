// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface RewardsDistributor {
    function refillBalance(string calldata _user, uint256 _amount) external;
}

contract Vault is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant REFILL_BALANCE_ROLE = keccak256("REFILL_BALANCE");

    IERC20 public ooneToken;
    IERC20 public usdtToken;

    address public rewardsDistributorOone;
    address public rewardsDistributorUsdt;

    uint256 public minWorkingBalance;
    uint256 public refillAmount;

    event RewardsDistributorOoneChanged(address oldRewardsDistributorOone, address newRewardsDistributorOone);
    event RewardsDistributorUsdtChanged(address oldRewardsDistributorUsdt, address newRewardsDistributorUsdt);
    event MinWorkingBalanceChanged(uint256 oldMinWorkingBalance, uint256 newMinWorkingBalance);
    event RefillAmountChanged(uint256 oldRefillAmount, uint256 newRefillAmount);

    event RewardsDistributorOoneRefilled(address rewardsDistributorOone, string indexed user, uint256 amount);
    event RewardsDistributorUsdtRefilled(address rewardsDistributorUsdt, string indexed user, uint256 amount);
    event BalanceRefilled(address indexed addr, uint256 amount);

    event NativeReceived(address indexed sender, uint256 amount);

    function initialize(
        address _ooneTokenAddress,
        address _usdtTokenAddress,
        address _rewardsDistributorOone,
        address _rewardsDistributorUsdt,
        uint256 _minWorkingBalance,
        uint256 _refillAmount,
        address _owner
    ) initializer public {
        __AccessControl_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _owner);

        ooneToken = IERC20(_ooneTokenAddress);
        usdtToken = IERC20(_usdtTokenAddress);

        rewardsDistributorOone = _rewardsDistributorOone;
        rewardsDistributorUsdt = _rewardsDistributorUsdt;

        minWorkingBalance = _minWorkingBalance;
        refillAmount = _refillAmount;
    }

    /* ========== SETTERS ========== */

    function setRewardsDistributorOone(address _rewardsDistributorOone) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsDistributorOoneChanged(rewardsDistributorOone, _rewardsDistributorOone);

        rewardsDistributorOone = _rewardsDistributorOone;
    }

    function setRewardsDistributorUsdt(address _rewardsDistributorUsdt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsDistributorUsdtChanged(rewardsDistributorUsdt, _rewardsDistributorUsdt);

        rewardsDistributorUsdt = _rewardsDistributorUsdt;
    }

    function setMinWorkingBalance(uint256 _minWorkingBalance) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit MinWorkingBalanceChanged(minWorkingBalance, _minWorkingBalance);

        minWorkingBalance = _minWorkingBalance;
    }

    function setRefillAmount(uint256 _refillAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RefillAmountChanged(refillAmount, _refillAmount);

        refillAmount = _refillAmount;
    }

    /* ========== REFILL FUNCTIONS ========== */

    function refillRewardsDistributorOone(string calldata _user, uint256 _amount) external onlyRole(REFILL_BALANCE_ROLE) {
        ooneToken.approve(rewardsDistributorOone, _amount);
        RewardsDistributor(rewardsDistributorOone).refillBalance(_user, _amount);

        emit RewardsDistributorOoneRefilled(rewardsDistributorOone, _user, _amount);
    }

    function refillRewardsDistributorUsdt(string calldata _user, uint256 _amount) external onlyRole(REFILL_BALANCE_ROLE) {
        usdtToken.approve(rewardsDistributorUsdt, _amount);
        RewardsDistributor(rewardsDistributorUsdt).refillBalance(_user, _amount);

        emit RewardsDistributorUsdtRefilled(rewardsDistributorUsdt, _user, _amount);
    }

    function refillBalances(address payable[] calldata addresses) external onlyRole(REFILL_BALANCE_ROLE) {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i].balance < minWorkingBalance) {
                addresses[i].transfer(refillAmount);

                emit BalanceRefilled(addresses[i], refillAmount);
            }
        }
    }

    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}

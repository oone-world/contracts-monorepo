// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface RewardsDistributor {
    function refillBalance(string calldata _user, uint256 _amount) external;
}

/**
 * @title Vault
 * @dev Smart contract for managing token balances and rewards distribution.
 */
contract Vault is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    using SafeERC20 for IERC20;

    // Role to refill the balances of rewards distributors.
    bytes32 public constant REFILL_BALANCE_ROLE = keccak256("REFILL_BALANCE");

    // Address of the OONE token contract.
    IERC20 public ooneToken;

    // Address of the USDT token contract.
    IERC20 public usdtToken;

    // Address of the rewards distributor contract for OONE tokens.
    address public rewardsDistributorOone;

    // Address of the rewards distributor contract for USDT tokens.
    address public rewardsDistributorUsdt;

    // Minimum working balance required for automated refills.
    uint256 public minWorkingBalance;

    // Amount to refill rewards distributor balances.
    uint256 public refillAmount;

    /**
     * @dev Emitted when the rewards distributor contract for OONE tokens is changed.
     * @param oldRewardsDistributorOone Address of the previous rewards distributor contract.
     * @param newRewardsDistributorOone Address of the new rewards distributor contract.
     */
    event RewardsDistributorOoneChanged(address oldRewardsDistributorOone, address newRewardsDistributorOone);

    /**
     * @dev Emitted when the rewards distributor contract for USDT tokens is changed.
     * @param oldRewardsDistributorUsdt Address of the previous rewards distributor contract.
     * @param newRewardsDistributorUsdt Address of the new rewards distributor contract.
     */
    event RewardsDistributorUsdtChanged(address oldRewardsDistributorUsdt, address newRewardsDistributorUsdt);

    /**
     * @dev Emitted when the minimum working balance parameter is changed.
     * @param oldMinWorkingBalance Previous minimum working balance.
     * @param newMinWorkingBalance New minimum working balance.
     */
    event MinWorkingBalanceChanged(uint256 oldMinWorkingBalance, uint256 newMinWorkingBalance);

    /**
     * @dev Emitted when the refill amount parameter is changed.
     * @param oldRefillAmount Previous refill amount.
     * @param newRefillAmount New refill amount.
     */
    event RefillAmountChanged(uint256 oldRefillAmount, uint256 newRefillAmount);

    /**
     * @dev Emitted when the rewards distributor contract for OONE tokens is refilled.
     * @param rewardsDistributorOone Address of the rewards distributor contract.
     * @param user User for whom the balance is being refilled.
     * @param amount Amount being refilled.
     */
    event RewardsDistributorOoneRefilled(address rewardsDistributorOone, string indexed user, uint256 amount);

    /**
     * @dev Emitted when the rewards distributor contract for USDT tokens is refilled.
     * @param rewardsDistributorUsdt Address of the rewards distributor contract.
     * @param user User for whom the balance is being refilled.
     * @param amount Amount being refilled.
     */
    event RewardsDistributorUsdtRefilled(address rewardsDistributorUsdt, string indexed user, uint256 amount);

    /**
     * @dev Emitted when an address balance is refilled.
     * @param addr Address whose balance is being refilled.
     * @param amount Amount being refilled.
     */
    event BalanceRefilled(address indexed addr, uint256 amount);

    /**
     * @dev Emitted when native currency (ether) is received.
     * @param sender Address sending the native currency.
     * @param amount Amount of native currency received.
     */
    event NativeReceived(address indexed sender, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    /**
     * @dev Initialize the Vault contract with initial parameters.
     * @param _ooneTokenAddress Address of the OONE token contract.
     * @param _usdtTokenAddress Address of the USDT token contract.
     * @param _rewardsDistributorOone Address of the rewards distributor contract for OONE tokens.
     * @param _rewardsDistributorUsdt Address of the rewards distributor contract for USDT tokens.
     * @param _minWorkingBalance Minimum working balance required for automated refills.
     * @param _refillAmount Amount to refill rewards distributor balances.
     * @param _owner Address of the contract owner with default admin role.
     */
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

    /**
     * @dev Set the rewards distributor contract for OONE tokens.
     * Only callable by the roles with the DEFAULT_ADMIN_ROLE.
     * @param _rewardsDistributorOone Address of the rewards distributor contract.
     */
    function setRewardsDistributorOone(address _rewardsDistributorOone) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsDistributorOoneChanged(rewardsDistributorOone, _rewardsDistributorOone);

        rewardsDistributorOone = _rewardsDistributorOone;
    }

    /**
     * @dev Set the rewards distributor contract for USDT tokens.
     * Only callable by the roles with the DEFAULT_ADMIN_ROLE.
     * @param _rewardsDistributorUsdt Address of the rewards distributor contract.
     */
    function setRewardsDistributorUsdt(address _rewardsDistributorUsdt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RewardsDistributorUsdtChanged(rewardsDistributorUsdt, _rewardsDistributorUsdt);

        rewardsDistributorUsdt = _rewardsDistributorUsdt;
    }

    /**
     * @dev Set the minimum working balance required for automated refills.
     * Only callable by the roles with the DEFAULT_ADMIN_ROLE.
     * @param _minWorkingBalance Minimum working balance.
     */
    function setMinWorkingBalance(uint256 _minWorkingBalance) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit MinWorkingBalanceChanged(minWorkingBalance, _minWorkingBalance);

        minWorkingBalance = _minWorkingBalance;
    }

    /**
     * @dev Set the refill amount for automated refills.
     * Only callable by the roles with the DEFAULT_ADMIN_ROLE.
     * @param _refillAmount Refill amount.
     */
    function setRefillAmount(uint256 _refillAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit RefillAmountChanged(refillAmount, _refillAmount);

        refillAmount = _refillAmount;
    }

    /**
     * @dev Refill the rewards distributor contract for OONE tokens.
     * Only callable by the roles with the REFILL_BALANCE_ROLE.
     * @param _user User for whom the balance is being refilled.
     * @param _amount Amount to refill.
     */
    function refillRewardsDistributorOone(string calldata _user, uint256 _amount)
        external
        onlyRole(REFILL_BALANCE_ROLE)
        checkIfTransferred(ooneToken, rewardsDistributorOone, _amount)
    {
        ooneToken.safeIncreaseAllowance(rewardsDistributorOone, _amount);
        RewardsDistributor(rewardsDistributorOone).refillBalance(_user, _amount);

        emit RewardsDistributorOoneRefilled(rewardsDistributorOone, _user, _amount);
    }

    /**
     * @dev Refill the rewards distributor contract for USDT tokens.
     * Only callable by the roles with the REFILL_BALANCE_ROLE.
     * @param _user User for whom the balance is being refilled.
     * @param _amount Amount to refill.
     */
    function refillRewardsDistributorUsdt(string calldata _user, uint256 _amount)
        external
        onlyRole(REFILL_BALANCE_ROLE)
        checkIfTransferred(usdtToken, rewardsDistributorUsdt, _amount)
    {
        usdtToken.safeIncreaseAllowance(rewardsDistributorUsdt, _amount);
        RewardsDistributor(rewardsDistributorUsdt).refillBalance(_user, _amount);

        emit RewardsDistributorUsdtRefilled(rewardsDistributorUsdt, _user, _amount);
    }

    /**
     * @dev Refill balances for multiple addresses if their balance is below the minimum working balance.
     * Only callable by the roles with the REFILL_BALANCE_ROLE.
     * @param addresses Array of addresses to refill balances for.
     */
    function refillBalances(address payable[] calldata addresses) external onlyRole(REFILL_BALANCE_ROLE) {
        for (uint256 i = 0; i < addresses.length; i++) {
            if (addresses[i].balance < minWorkingBalance) {
                Address.sendValue(addresses[i], refillAmount);

                emit BalanceRefilled(addresses[i], refillAmount);
            }
        }
    }

    /**
     * @dev Fallback function to receive native currency (ether).
     */
    receive() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to receive native currency (ether).
     */
    fallback() external payable {
        emit NativeReceived(msg.sender, msg.value);
    }

    /**
     * @dev Authorize contract upgrades.
     * Only callable by the contract owner with the DEFAULT_ADMIN_ROLE.
     * @param newImplementation Address of the new implementation contract.
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    /**
     * @dev Modifier that checks amount of token was transferred to address.
     * Reverts with an "Failed to transfer" error.
     */
    modifier checkIfTransferred(IERC20 _token, address _address, uint256 _amount) {
        uint256 balanceBefore = _token.balanceOf(_address);
        _;
        uint256 balanceAfter = _token.balanceOf(_address);

        require(balanceAfter - balanceBefore == _amount, "Failed to transfer");
    }
}

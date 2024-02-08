// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Mintable {
    function mint(address, uint256) external;
}

/**
 * @title Vesting Smart Contract
 * @dev This contract enables gradual token vesting over time.
 */
contract Vesting {
    // Duration of each vesting period
    uint256 constant public DURATION = 30 days;
    // Maximum amount of tokens that can be minted in each vesting period
    uint256 constant public MAX_MINTABLE_AMOUNT = 7_500_000 * 1e18;
    
    // Address of the contract owner
    address immutable public owner;
    // Address of the ERC20 token contract
    IERC20Mintable immutable public token;

    // Timestamp of the last update
    uint256 public lastUpdated;
    // The amount of tokens that can be minted in the current vesting period
    uint256 public mintableAmount;
    // Boolean flag indicating whether the vesting process is stopped
    bool public isStopped = false;

    // Event fired when tokens are minted
    event TokensMinted(uint256 amount);
    // Event fired when the vesting process is stopped
    event VestingStopped();

    /**
     * @dev Constructor to initialize the contract with owner and token addresses
     * @param _owner Address of the contract owner
     * @param _token Address of the ERC20 token contract
     */
    constructor(address _owner, IERC20Mintable _token) {
        owner = _owner;
        token = _token;
        lastUpdated = block.timestamp;
        mintableAmount = MAX_MINTABLE_AMOUNT;
    }

    /**
     * @dev Function to mint tokens to the caller
     * Only callable by the contract owner
     * @param _amount Amount of tokens to mint
     */
    function mint(uint256 _amount) external onlyOwner {
        require(isStopped == false, 'Vesting is stopped');

        // Calculate the number of vesting periods passed since the last update
        uint256 durationsPassed = (block.timestamp - lastUpdated) / DURATION;
        if (durationsPassed > 0) {
            lastUpdated = block.timestamp;
            // Update the mintable amount based on the elapsed time
            mintableAmount += durationsPassed * MAX_MINTABLE_AMOUNT;
        }

        // Check if the requested amount is within the limit for the current vesting period
        require(mintableAmount >= _amount, 'Limit on minting is reached for this duration');

        // Update the mintable amount and mint tokens to the caller
        mintableAmount -= _amount;
        token.mint(msg.sender, _amount);

        emit TokensMinted(_amount);
    }

    /**
     * @dev Function to stop the vesting process
     * Only callable by the contract owner
     */
    function stop() external onlyOwner {
        isStopped = true;

        emit VestingStopped();
    }

    /**
     * @dev Modifier to restrict access to functions only to the contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner is allowed to call this function');
        _;
    }
}

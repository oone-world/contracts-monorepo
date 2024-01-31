// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Mintable {
    function mint(address, uint256) external;
}

contract Vesting {
    uint256 constant public DURATION = 30 days;
    uint256 constant public MAX_MINTABLE_AMOUNT = 7_500_000 * 1e18;
    
    address immutable public owner;
    IERC20Mintable immutable public token;

    uint256 public lastUpdated;
    uint256 public mintableAmount;
    bool public isStopped = false;

    event TokensMinted(uint256 amount);
    event VestingStopped();

    constructor(address _owner, IERC20Mintable _token) {
        owner = _owner;
        token = _token;
        lastUpdated = block.timestamp;
        mintableAmount = MAX_MINTABLE_AMOUNT;
    }

    function mint(uint256 _amount) external onlyOwner {
        require(isStopped == false, 'Vesting is stopped');

        uint256 durationsPassed = (block.timestamp - lastUpdated) / DURATION;
        if (durationsPassed > 0) {
            lastUpdated = block.timestamp;
            mintableAmount += durationsPassed * MAX_MINTABLE_AMOUNT;
        }

        require(mintableAmount >= _amount, 'Limit on minting is reached for this duration');

        mintableAmount -= _amount;
        token.mint(msg.sender, _amount);

        emit TokensMinted(_amount);
    }

    function stop() external onlyOwner {
        isStopped = true;

        emit VestingStopped();
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'Only owner is allowed to call this function');
        _;
    }
}

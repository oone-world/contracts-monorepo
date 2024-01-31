// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardsDistributorMock {
    using SafeERC20 for IERC20;

    IERC20 public rewardsToken;

    constructor(
        address _rewardsTokenAddress
    ) {
        rewardsToken = IERC20(_rewardsTokenAddress);
    }

    function refillBalance(string calldata _user, uint256 _amount) external {
        rewardsToken.safeTransferFrom(msg.sender, address(this), _amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract RewardsTokenWithoutTransfer is ERC20 {
    constructor() ERC20("OONE", "OONE") {
        _mint(msg.sender, 1_000_000_000_000 * 10 ** decimals());
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        return true;
    }
}

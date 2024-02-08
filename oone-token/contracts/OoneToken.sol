// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OoneToken
 * @dev OONE token facilitates decentralized finance transactions within a specific ecosystem.
 * It provides minting, burning, and ownership functionality, conforming to the ERC20 standard.
 */
contract OoneToken is ERC20, ERC20Burnable, Ownable {
    /**
     * @dev Initializes the OONE token contract with the given initial owner.
     * @param initialOwner The address that will initially own all tokens.
     */
    constructor(address initialOwner)
        ERC20("OONE", "OONE")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints new tokens and assigns them to the specified address.
     * Only the contract owner can call this function.
     * @param to The address to which new tokens will be minted.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

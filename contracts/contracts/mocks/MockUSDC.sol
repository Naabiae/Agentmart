// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../interfaces/IERC20Authorization.sol";

contract MockUSDC is ERC20, IERC20Authorization {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        // Simplified for testing, bypass actual EIP-712 validation
        _transfer(from, to, value);
    }
}

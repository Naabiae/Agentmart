// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ProtocolFee is Ownable {
    uint256 public feePercent; // e.g. 100 = 1.00%
    address public feeRecipient;

    event FeePercentUpdated(uint256 newFeePercent);
    event FeeRecipientUpdated(address newFeeRecipient);

    constructor(uint256 _initialFeePercent, address _initialFeeRecipient) Ownable(msg.sender) {
        require(_initialFeePercent <= 10000, "Fee percent cannot exceed 100%");
        require(_initialFeeRecipient != address(0), "Invalid fee recipient");
        
        feePercent = _initialFeePercent;
        feeRecipient = _initialFeeRecipient;
    }

    function updateFeePercent(uint256 _newFeePercent) external onlyOwner {
        require(_newFeePercent <= 10000, "Fee percent cannot exceed 100%");
        feePercent = _newFeePercent;
        emit FeePercentUpdated(_newFeePercent);
    }

    function updateFeeRecipient(address _newFeeRecipient) external onlyOwner {
        require(_newFeeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _newFeeRecipient;
        emit FeeRecipientUpdated(_newFeeRecipient);
    }

    function calculateFee(uint256 amount) external view returns (uint256) {
        return (amount * feePercent) / 10000;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentMart {
    enum OrderStatus {
        Open,
        Matched,
        InProgress,
        Delivered,
        Disputed,
        Completed,
        Cancelled
    }

    enum BidStatus {
        Active,
        Accepted,
        Rejected
    }

    enum OrderCategory {
        Goods,
        Services,
        Digital,
        Logistics,
        Other
    }

    struct Order {
        bytes32 orderId;
        address buyer;
        string itemDescription;
        OrderCategory category;
        uint256 budgetWei;
        uint256 deadline;
        string location;
        OrderStatus status;
        bytes32 acceptedBidId;
    }

    struct Bid {
        bytes32 bidId;
        bytes32 orderId;
        address seller;
        uint256 priceWei;
        uint256 estimatedDelivery;
        uint256 reputationScore;
        BidStatus status;
    }

    struct AgentProfile {
        address agentAddress;
        string passportId;
        uint256 totalOrders;
        uint256 totalDisputes;
        uint256 reputationScore;
        bool isActive;
    }
}

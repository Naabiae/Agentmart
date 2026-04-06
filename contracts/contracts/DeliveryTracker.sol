// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentMart.sol";

interface IOrderBookTracker {
    function getOrder(bytes32) external view returns (IAgentMart.Order memory);
    function updateOrderStatus(bytes32, IAgentMart.OrderStatus, bytes32) external;
    function releaseEscrow(bytes32) external;
}

interface IBidEngineTracker {
    function getBid(bytes32) external view returns (IAgentMart.Bid memory);
}

// Replace Ownable with Gnosis Safe post-hackathon
contract DeliveryTracker is Ownable {
    IOrderBookTracker public orderBook;
    IBidEngineTracker public bidEngine;

    struct DeliveryMilestone {
        string status;
        uint256 timestamp;
        string note;
    }

    mapping(bytes32 => DeliveryMilestone[]) private orderMilestones;

    event MilestonePosted(bytes32 indexed orderId, string status, uint256 timestamp, string note);
    event DeliveryConfirmed(bytes32 indexed orderId);

    constructor(address _orderBook, address _bidEngine) Ownable(msg.sender) {
        orderBook = IOrderBookTracker(_orderBook);
        bidEngine = IBidEngineTracker(_bidEngine);
    }

    function postMilestone(bytes32 orderId, string memory status, string memory note) external {
        IAgentMart.Order memory order = orderBook.getOrder(orderId);
        require(order.status == IAgentMart.OrderStatus.Matched || order.status == IAgentMart.OrderStatus.InProgress || order.status == IAgentMart.OrderStatus.Delivered, "Order must be Matched, InProgress, or Delivered");

        IAgentMart.Bid memory acceptedBid = bidEngine.getBid(order.acceptedBidId);
        require(acceptedBid.seller == msg.sender, "Only accepted seller can post milestone");

        if (order.status == IAgentMart.OrderStatus.Matched) {
            orderBook.updateOrderStatus(orderId, IAgentMart.OrderStatus.InProgress, order.acceptedBidId);
        }
        
        // Let frontend/sellers define specific keywords, e.g. "Delivered"
        if (keccak256(bytes(status)) == keccak256(bytes("Delivered"))) {
            orderBook.updateOrderStatus(orderId, IAgentMart.OrderStatus.Delivered, order.acceptedBidId);
        }

        DeliveryMilestone memory milestone = DeliveryMilestone({
            status: status,
            timestamp: block.timestamp,
            note: note
        });

        orderMilestones[orderId].push(milestone);

        emit MilestonePosted(orderId, status, block.timestamp, note);
    }

    function getMilestones(bytes32 orderId) external view returns (DeliveryMilestone[] memory) {
        return orderMilestones[orderId];
    }

    function confirmDelivery(bytes32 orderId) external {
        IAgentMart.Order memory order = orderBook.getOrder(orderId);
        require(order.buyer == msg.sender, "Only buyer can confirm delivery");
        require(order.status == IAgentMart.OrderStatus.Delivered || order.status == IAgentMart.OrderStatus.InProgress || order.status == IAgentMart.OrderStatus.Matched, "Invalid order status for confirmation");

        orderBook.releaseEscrow(orderId);
        emit DeliveryConfirmed(orderId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentMart.sol";

interface IAgentRegistry {
    function getAgent(address) external view returns (IAgentMart.AgentProfile memory);
}

interface IOrderBook {
    function getOrder(bytes32) external view returns (IAgentMart.Order memory);
    function updateOrderStatus(bytes32, IAgentMart.OrderStatus, bytes32) external;
}

interface IDeliveryTracker {
    // interface for deployment wiring, will be implemented later
}

// Replace Ownable with Gnosis Safe post-hackathon
contract BidEngine is Ownable, ReentrancyGuard {
    IAgentRegistry public agentRegistry;
    IOrderBook public orderBook;
    address public deliveryTracker;

    mapping(bytes32 => IAgentMart.Bid) private bids;
    mapping(bytes32 => bytes32[]) private orderBids;
    mapping(address => uint256) public userNonces;

    event BidPlaced(bytes32 indexed orderId, bytes32 indexed bidId, address indexed seller, uint256 priceWei, uint256 estimatedDelivery);
    event BidAccepted(bytes32 indexed orderId, bytes32 indexed bidId);

    constructor(address _agentRegistry, address _orderBook) Ownable(msg.sender) {
        agentRegistry = IAgentRegistry(_agentRegistry);
        orderBook = IOrderBook(_orderBook);
    }

    function setDeliveryTracker(address _deliveryTracker) external onlyOwner {
        deliveryTracker = _deliveryTracker;
    }

    modifier onlyRegistered(address agentAddress) {
        require(agentRegistry.getAgent(agentAddress).isActive, "Agent is not registered or inactive");
        _;
    }

    function placeBid(bytes32 orderId, uint256 priceWei, uint256 estimatedDelivery) external onlyRegistered(msg.sender) nonReentrant {
        IAgentMart.Order memory order = orderBook.getOrder(orderId);
        require(order.status == IAgentMart.OrderStatus.Open, "Order is not Open");
        require(order.buyer != msg.sender, "Buyer cannot bid on own order");

        userNonces[msg.sender]++;
        bytes32 bidId = keccak256(abi.encodePacked(msg.sender, block.timestamp, userNonces[msg.sender]));

        IAgentMart.AgentProfile memory sellerProfile = agentRegistry.getAgent(msg.sender);

        bids[bidId] = IAgentMart.Bid({
            bidId: bidId,
            orderId: orderId,
            seller: msg.sender,
            priceWei: priceWei,
            estimatedDelivery: estimatedDelivery,
            reputationScore: sellerProfile.reputationScore,
            status: IAgentMart.BidStatus.Active
        });

        orderBids[orderId].push(bidId);

        emit BidPlaced(orderId, bidId, msg.sender, priceWei, estimatedDelivery);
    }

    function acceptBid(bytes32 orderId, bytes32 bidId) external nonReentrant {
        IAgentMart.Order memory order = orderBook.getOrder(orderId);
        require(order.buyer == msg.sender, "Only buyer can accept bid");
        require(order.status == IAgentMart.OrderStatus.Open, "Order is not Open");
        
        IAgentMart.Bid storage acceptedBid = bids[bidId];
        require(acceptedBid.orderId == orderId, "Bid does not belong to order");
        require(acceptedBid.status == IAgentMart.BidStatus.Active, "Bid is not Active");

        acceptedBid.status = IAgentMart.BidStatus.Accepted;

        bytes32[] memory allBids = orderBids[orderId];
        for (uint256 i = 0; i < allBids.length; i++) {
            if (allBids[i] != bidId) {
                bids[allBids[i]].status = IAgentMart.BidStatus.Rejected;
            }
        }

        orderBook.updateOrderStatus(orderId, IAgentMart.OrderStatus.Matched, bidId);

        emit BidAccepted(orderId, bidId);
    }

    function getBid(bytes32 bidId) external view returns (IAgentMart.Bid memory) {
        return bids[bidId];
    }

    function getBidsForOrder(bytes32 orderId) external view returns (IAgentMart.Bid[] memory) {
        bytes32[] memory bidIds = orderBids[orderId];
        IAgentMart.Bid[] memory orderBidsArray = new IAgentMart.Bid[](bidIds.length);
        for (uint256 i = 0; i < bidIds.length; i++) {
            orderBidsArray[i] = bids[bidIds[i]];
        }
        return orderBidsArray;
    }
}

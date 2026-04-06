// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentMart.sol";
import "./interfaces/IERC20Authorization.sol";

interface IAgentRegistry {
    function getAgent(address) external view returns (IAgentMart.AgentProfile memory);
}

interface IBidEngine {
    function getBid(bytes32 bidId) external view returns (IAgentMart.Bid memory);
}

interface IProtocolFee {
    function calculateFee(uint256 amount) external view returns (uint256);
    function feeRecipient() external view returns (address);
}

contract OrderBook is Ownable, ReentrancyGuard {
    IERC20Authorization public usdc;
    IAgentRegistry public agentRegistry;
    address public bidEngine;
    address public deliveryTracker;
    IProtocolFee public protocolFee;

    mapping(address => uint256) public userNonces;
    mapping(bytes32 => IAgentMart.Order) private orders;
    bytes32[] private orderIds;

    event OrderCreated(bytes32 indexed orderId, address indexed buyer, string itemDescription, uint256 budgetWei, uint256 deadline);
    event OrderCancelled(bytes32 indexed orderId);
    event OrderStatusUpdated(bytes32 indexed orderId, IAgentMart.OrderStatus newStatus, bytes32 acceptedBidId);
    event EscrowReleased(bytes32 indexed orderId, address seller, uint256 sellerAmount, uint256 feeAmount);
    event EscrowRefunded(bytes32 indexed orderId, address buyer, uint256 amount);

    constructor(address _usdc, address _agentRegistry) Ownable(msg.sender) {
        usdc = IERC20Authorization(_usdc);
        agentRegistry = IAgentRegistry(_agentRegistry);
    }

    function setBidEngine(address _bidEngine) external onlyOwner {
        bidEngine = _bidEngine;
    }

    function setDeliveryTracker(address _deliveryTracker) external onlyOwner {
        deliveryTracker = _deliveryTracker;
    }

    function setProtocolFee(address _protocolFee) external onlyOwner {
        protocolFee = IProtocolFee(_protocolFee);
    }

    modifier onlyRegistered(address agentAddress) {
        require(agentRegistry.getAgent(agentAddress).isActive, "Agent is not registered or inactive");
        _;
    }

    modifier onlyBidEngine() {
        require(msg.sender == bidEngine, "Only BidEngine");
        _;
    }

    modifier onlyDeliveryTracker() {
        require(msg.sender == deliveryTracker, "Only DeliveryTracker");
        _;
    }

    function createOrderGasless(
        address buyer,
        string memory description,
        IAgentMart.OrderCategory category,
        uint256 budgetWei,
        uint256 deadlineTimestamp,
        string memory location,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyRegistered(buyer) nonReentrant {
        require(budgetWei > 0, "Budget must be > 0");
        require(deadlineTimestamp > block.timestamp, "Deadline must be in the future");
        require(bytes(description).length >= 10, "Description too short");

        usdc.transferWithAuthorization(buyer, address(this), budgetWei, validAfter, validBefore, nonce, v, r, s);

        userNonces[buyer]++;
        bytes32 orderId = keccak256(abi.encodePacked(buyer, block.timestamp, userNonces[buyer]));

        orders[orderId] = IAgentMart.Order({
            orderId: orderId,
            buyer: buyer,
            itemDescription: description,
            category: category,
            budgetWei: budgetWei,
            deadline: deadlineTimestamp,
            location: location,
            status: IAgentMart.OrderStatus.Open,
            acceptedBidId: bytes32(0)
        });

        orderIds.push(orderId);

        emit OrderCreated(orderId, buyer, description, budgetWei, deadlineTimestamp);
    }

    function cancelOrder(bytes32 orderId) external nonReentrant {
        IAgentMart.Order storage order = orders[orderId];
        require(order.buyer == msg.sender, "Only buyer can cancel");
        require(order.status == IAgentMart.OrderStatus.Open, "Order is not Open");

        order.status = IAgentMart.OrderStatus.Cancelled;
        
        require(usdc.transfer(order.buyer, order.budgetWei), "USDC transfer failed");

        emit OrderCancelled(orderId);
    }

    function getOrder(bytes32 orderId) external view returns (IAgentMart.Order memory) {
        return orders[orderId];
    }

    function getOpenOrders(uint256 offset, uint256 limit) external view returns (IAgentMart.Order[] memory) {
        uint256 openCount = 0;
        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == IAgentMart.OrderStatus.Open) {
                openCount++;
            }
        }

        uint256 start = offset;
        uint256 end = offset + limit > openCount ? openCount : offset + limit;
        if (start >= openCount) {
            return new IAgentMart.Order[](0);
        }

        IAgentMart.Order[] memory openOrders = new IAgentMart.Order[](end - start);
        uint256 index = 0;
        uint256 current = 0;

        for (uint256 i = 0; i < orderIds.length; i++) {
            if (orders[orderIds[i]].status == IAgentMart.OrderStatus.Open) {
                if (current >= start && current < end) {
                    openOrders[index] = orders[orderIds[i]];
                    index++;
                }
                current++;
            }
        }

        return openOrders;
    }

    function updateOrderStatus(bytes32 orderId, IAgentMart.OrderStatus status, bytes32 acceptedBidId) external onlyBidEngine {
        orders[orderId].status = status;
        if (acceptedBidId != bytes32(0)) {
            orders[orderId].acceptedBidId = acceptedBidId;
        }
        emit OrderStatusUpdated(orderId, status, acceptedBidId);
    }

    function releaseEscrow(bytes32 orderId) external onlyDeliveryTracker nonReentrant {
        IAgentMart.Order storage order = orders[orderId];
        require(order.status == IAgentMart.OrderStatus.Delivered || order.status == IAgentMart.OrderStatus.InProgress || order.status == IAgentMart.OrderStatus.Matched, "Invalid order status");

        order.status = IAgentMart.OrderStatus.Completed;

        IAgentMart.Bid memory acceptedBid = IBidEngine(bidEngine).getBid(order.acceptedBidId);
        
        uint256 feeAmount = protocolFee.calculateFee(acceptedBid.priceWei);
        uint256 sellerAmount = acceptedBid.priceWei - feeAmount;
        uint256 refundToBuyer = order.budgetWei - acceptedBid.priceWei;

        require(usdc.transfer(protocolFee.feeRecipient(), feeAmount), "Fee transfer failed");
        require(usdc.transfer(acceptedBid.seller, sellerAmount), "Seller transfer failed");
        
        if (refundToBuyer > 0) {
            require(usdc.transfer(order.buyer, refundToBuyer), "Buyer refund failed");
        }

        emit EscrowReleased(orderId, acceptedBid.seller, sellerAmount, feeAmount);
    }

    function refundEscrow(bytes32 orderId) external onlyOwner nonReentrant {
        IAgentMart.Order storage order = orders[orderId];
        require(order.status != IAgentMart.OrderStatus.Completed && order.status != IAgentMart.OrderStatus.Cancelled, "Order already closed");

        order.status = IAgentMart.OrderStatus.Cancelled;
        
        require(usdc.transfer(order.buyer, order.budgetWei), "USDC transfer failed");

        emit EscrowRefunded(orderId, order.buyer, order.budgetWei);
    }
}

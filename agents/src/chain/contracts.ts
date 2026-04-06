import { ethers } from "ethers";
import { getDeployments, getProvider, getWallet } from "./client";
export { getDeployments, getProvider, getWallet };

const AgentRegistryABI = [
    "function getAgent(address) view returns (tuple(address agentAddress, string passportId, uint256 totalOrders, uint256 totalDisputes, uint256 reputationScore, bool isActive))",
    "function registerAgent(string passportId)"
];

const OrderBookABI = [
    "function getOrder(bytes32) view returns (tuple(bytes32 orderId, address buyer, string itemDescription, uint8 category, uint256 budgetWei, uint256 deadline, string location, uint8 status, bytes32 acceptedBidId))",
    "function getOpenOrders(uint256 offset, uint256 limit) view returns (tuple(bytes32 orderId, address buyer, string itemDescription, uint8 category, uint256 budgetWei, uint256 deadline, string location, uint8 status, bytes32 acceptedBidId)[])",
    "function createOrderGasless(address buyer, string description, uint8 category, uint256 budgetWei, uint256 deadlineTimestamp, string location, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)"
];

const BidEngineABI = [
    "function placeBid(bytes32 orderId, uint256 priceWei, uint256 estimatedDelivery)",
    "function acceptBid(bytes32 orderId, bytes32 bidId)",
    "function getBidsForOrder(bytes32 orderId) view returns (tuple(bytes32 bidId, bytes32 orderId, address seller, uint256 priceWei, uint256 estimatedDelivery, uint256 reputationScore, uint8 status)[])",
    "event BidPlaced(bytes32 indexed orderId, bytes32 indexed bidId, address indexed seller, uint256 priceWei, uint256 estimatedDelivery)"
];

const DeliveryTrackerABI = [
    "function postMilestone(bytes32 orderId, string status, string note)",
    "function confirmDelivery(bytes32 orderId)",
    "function getMilestones(bytes32 orderId) view returns (tuple(string status, uint256 timestamp, string note)[])"
];

export const getContracts = (signerOrProvider?: ethers.Signer | ethers.Provider) => {
    const deployments = getDeployments();
    const runner = signerOrProvider || getProvider();

    return {
        AgentRegistry: new ethers.Contract(deployments.agentRegistry, AgentRegistryABI, runner),
        OrderBook: new ethers.Contract(deployments.orderBook, OrderBookABI, runner),
        BidEngine: new ethers.Contract(deployments.bidEngine, BidEngineABI, runner),
        DeliveryTracker: new ethers.Contract(deployments.deliveryTracker, DeliveryTrackerABI, runner),
    };
};

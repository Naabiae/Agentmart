export const CONTRACTS = {
  OrderBook: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", // Addr from our local deploy
  BidEngine: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  DeliveryTracker: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  USDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
};

export const OrderBookABI = [
  "function getOpenOrders(uint256 offset, uint256 limit) view returns (tuple(bytes32 orderId, address buyer, string itemDescription, uint8 category, uint256 budgetWei, uint256 deadline, string location, uint8 status, bytes32 acceptedBidId)[])",
  "function getOrder(bytes32 orderId) view returns (tuple(bytes32 orderId, address buyer, string itemDescription, uint8 category, uint256 budgetWei, uint256 deadline, string location, uint8 status, bytes32 acceptedBidId))",
  "function createOrderGasless(address buyer, string description, uint8 category, uint256 budgetWei, uint256 deadlineTimestamp, string location, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)"
];

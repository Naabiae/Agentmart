import os

with open('/workspace/AGENTMART_DEV_ISSUES.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Order ID nonce tracking in Issue 5
content = content.replace(
    'generates a unique `orderId` using `keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce))`',
    'generates a unique `orderId` using `keccak256(abi.encodePacked(msg.sender, block.timestamp, ++userNonces[msg.sender]))` (requiring a `mapping(address => uint256) userNonces` state variable)'
)

# 2. Fix Escrow Release Authorization & add getBidsForOrder in Issue 6
content = content.replace(
    'Add `releaseEscrow(bytes32 orderId)` callable only by the buyer once they mark delivery confirmed — it sends funds to the seller.',
    'Add `releaseEscrow(bytes32 orderId)` callable ONLY by the `DeliveryTracker` contract — it sends funds to the seller. Also expose a `getBidsForOrder(bytes32 orderId)` view function.'
)

# 3. Fix ProtocolFee & Circular Dependency in Issue 7 & 7.5
content = content.replace(
    'It should deploy `AgentRegistry`, then `OrderBook`, `BidEngine`, and `DeliveryTracker` using constructor injection. Save all deployed addresses to `deployments/kite_testnet.json`.',
    'It should deploy `AgentRegistry`, `OrderBook`, `ProtocolFee`, then `BidEngine` (passing ProtocolFee address), and finally `DeliveryTracker` (passing BidEngine address). Then call `BidEngine.setDeliveryTracker(DeliveryTracker.address)` to resolve the circular dependency. Save all deployed addresses to `deployments/kite_testnet.json`.'
)

# 4. Fix MatchingAgent API in Issue 11
content = content.replace(
    'Write ranked bid data to a Redis key or simple JSON file that the frontend can poll.',
    'Write ranked bid data to a Redis key or simple JSON file, and expose a `GET /api/bids/:orderId` Express endpoint for the frontend to poll.'
)

# 5. Fix Ramp Flow contradiction in Issue 12
content = content.replace(
    'On confirmed completion, parse the received USDC amount and call `OrderBook.createOrder`.',
    'On confirmed completion, parse the received KITE amount and emit an SSE to the frontend so the connected buyer wallet can sign and execute `OrderBook.createOrder`.'
)

with open('/workspace/AGENTMART_DEV_ISSUES.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("Final logical gaps patched successfully.")

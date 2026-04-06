import re

with open('/workspace/AGENTMART_DEV_ISSUES.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Issue #5 - OrderBook
content = re.sub(
    r'The `createOrder\(string description, uint256 budgetWei, uint256 deadlineTimestamp, string location\)` function accepts payment \(native token for hackathon\), generates a unique `orderId` using `keccak256\(abi\.encodePacked\(msg\.sender, block\.timestamp, \+\+userNonces\[msg\.sender\]\)\)` \(requiring a `mapping\(address => uint256\) userNonces` state variable\), stores the Order struct, and emits an `OrderCreated` event\. Add `cancelOrder\(bytes32 orderId\)` — only callable by the buyer if status is still `Open`\.',
    r'The `createOrderGasless(address buyer, string description, uint256 budgetWei, uint256 deadlineTimestamp, string location, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)` function accepts USDC via EIP-3009 gasless transfer. It calls `USDC.transferWithAuthorization(buyer, address(this), budgetWei, ...)` to pull funds directly from the buyer into the `OrderBook` contract. It generates a unique `orderId` using `keccak256(abi.encodePacked(buyer, block.timestamp, ++userNonces[buyer]))` (requiring a `mapping(address => uint256) userNonces` state variable), stores the Order struct, and emits an `OrderCreated` event. Add `cancelOrder(bytes32 orderId)` — only callable by the buyer if status is still `Open`.',
    content
)

# 2. Update Issue #6 - BidEngine
content = re.sub(
    r'changes all other bids for that order to `Rejected`, and locks the buyer\'s budget into an internal escrow mapping \(`mapping\(bytes32 => uint256\) escrowBalance`\)\. Add `releaseEscrow\(bytes32 orderId\)` callable ONLY by the `DeliveryTracker` contract — it sends funds to the seller\. Also expose a `getBidsForOrder\(bytes32 orderId\)` view function\. Add `refundEscrow\(bytes32 orderId\)` callable by owner in dispute cases\.',
    r'changes all other bids for that order to `Rejected`. Since `OrderBook` already holds the USDC from `createOrderGasless`, `BidEngine` simply updates the statuses. Move the `releaseEscrow(bytes32 orderId)` and `refundEscrow(bytes32 orderId)` functions into `OrderBook`, but make them callable ONLY by the `DeliveryTracker` contract or the owner (for refunds). `releaseEscrow` sends the USDC to the seller. Also expose a `getBidsForOrder(bytes32 orderId)` view function in `BidEngine`.',
    content
)

# 3. Update Issue #7 - DeliveryTracker
content = re.sub(
    r'internally calls `BidEngine\.releaseEscrow`',
    r'internally calls `OrderBook.releaseEscrow`',
    content
)
content = re.sub(
    r'The `BidEngine\.releaseEscrow` function calls `ProtocolFee\.calculateFee` before splitting the payment: fee to `feeRecipient`, remainder to seller\.',
    r'The `OrderBook.releaseEscrow` function calls `ProtocolFee.calculateFee` before splitting the USDC payment: fee to `feeRecipient`, remainder to seller.',
    content
)

# 4. Update Issue #12 - RampAgent
content = re.sub(
    r'On confirmed completion, parse the received KITE amount and emit an SSE to the frontend so the connected buyer wallet can sign and execute `OrderBook\.createOrder`\.',
    r'On confirmed completion, parse the received USDC amount. The `RampAgent` then automatically submits `OrderBook.createOrderGasless` on behalf of the user using the EIP-3009 authorization signature previously captured from the frontend, paying the KITE gas fee itself.',
    content
)
content = re.sub(
    r'after `BidEngine\.releaseEscrow`',
    r'after `OrderBook.releaseEscrow`',
    content
)
content = re.sub(
    r'\(For MVP: ramp only buys native KITE; order creation still signed by buyer wallet\. Post-hackathon: use gasless \+ meta-tx\)\.',
    r'(MVP includes true Mode 2 gasless tx: user pays fiat, receives USDC, RampAgent relays transaction).',
    content
)

# 5. Update Issue #14 - Buyer flow UI
content = re.sub(
    r'Step 3: embed the ramp payment widget — MoonPay as a hosted URL in an iframe, or Transak\'s React widget component\. On payment confirmation \(your backend emits a Server-Sent Event to the frontend via a `/events` endpoint\), navigate to `/orders/\[orderId\]`\.',
    r'Step 3: Prompt the buyer to sign an EIP-712 off-chain message (EIP-3009 `transferWithAuthorization`) for the USDC budget. Send this signature to the backend. Step 4: Embed the ramp payment widget. On payment confirmation, the backend executes the gasless transaction and emits an SSE, then the frontend navigates to `/orders/[orderId]`.',
    content
)
content = re.sub(
    r'Step 4: Complete sandbox payment → frontend signs createOrder → order appears on-chain',
    r'Step 4: Complete sandbox payment → RampAgent executes gasless transaction → order appears on-chain',
    content
)
content = re.sub(
    r'after the frontend signs `createOrder` \(using the connected buyer wallet\)',
    r'after the RampAgent signs `createOrderGasless` as a relayer',
    content
)

# 6. Remove Issues #18 and #19
content = re.sub(
    r'### Issue #18 — Post-hackathon: USDC upgrade \+ mainnet prep\n\n\*\*What to build\*\*[\s\S]*?(?=## Summary — Issue Index)',
    r'',
    content
)

# 7. Clean up Summary Table
content = re.sub(r'\| 18 \| USDC upgrade \+ mainnet prep \| post-hack \| contracts v2, mainnet config \|\n', '', content)
content = re.sub(r'\| 19 \| Meta-tx \+ Stablecoin Gasless \+ Mode 2 \| post-hack \| ERC2771Context \|\n', '', content)

with open('/workspace/AGENTMART_DEV_ISSUES.md', 'w', encoding='utf-8') as f:
    f.write(content)

print("USDC Gasless integrated successfully.")

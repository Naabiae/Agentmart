# AgentMart — Development Issues & Build Roadmap

> **Project:** AgentMart — Agentic Commerce Network on Kite AI  
> **Hackathon:** Kite AI Global Hackathon 2026 (Encode Club) — Agentic Commerce Track  
> **Stack:** Solidity · Hardhat · TypeScript · Node.js · Next.js · Kite EVM Testnet (Ozone)  
> **Docs:** https://docs.gokite.ai · https://encodeclub.com/programmes/kites-hackathon-ai-agentic-economy  
> **Timeline:** 4 weeks (March 27 – April 26, 2026)

---

## How to Read This Document

Each issue follows this format:

- **What to build** — the goal in plain terms
- **How to build it** — approach and method, no code
- **Resources** — exact docs/links needed
- **✅ Test pass** — what passing looks like; you don't move to the next issue until this passes

Issues are grouped into five phases:

| Phase | Issues | Focus |
|---|---|---|
| 0 | #1–3 | Repo, tooling, Kite chain setup |
| 1 | #4–7 | Core smart contracts |
| 2 | #8–11 | Agent layer (backend) |
| 3 | #12–15 | Ramp integration + frontend |
| 4 | #16–18 | Integration, polish, submission |

---

## Phase 0 — Foundations

---

### Issue #1 — Repo scaffold + Hardhat setup on Kite testnet

**What to build**

A clean monorepo with separate workspaces for contracts, backend agents, and frontend. Hardhat configured to compile and deploy to Kite Ozone testnet. A counter contract deployed and verified as the smoke test that the chain connection works.

**How to build it**

Initialize a monorepo using npm workspaces or pnpm workspaces with three top-level folders: `contracts/`, `agents/`, and `frontend/`. Inside `contracts/`, initialize a Hardhat project. Install `hardhat`, `@nomicfoundation/hardhat-toolbox`, and `dotenv`. Configure `hardhat.config.ts` with two networks: `hardhat` (local) and `kite_testnet`. The Kite Ozone testnet RPC and chain ID are in the Kite docs network information page. Store the deployer private key in a `.env` file and add `.env` to `.gitignore` immediately. Write a minimal `Counter.sol` contract with an increment function and a public getter. Write a Hardhat deploy script and a Hardhat test. Run the test on the local Hardhat network first, then deploy to Kite testnet using the deploy script.

**Resources**

- Kite testnet network info: https://docs.gokite.ai/kite-chain/1-getting-started/network-information
- Kite Hardhat counter walkthrough: https://docs.gokite.ai/kite-chain/3-developing/counter-smart-contract-hardhat
- Kite environment setup: https://docs.gokite.ai/kite-chain/3-developing/setup-environment
- Hardhat docs: https://hardhat.org/hardhat-runner/docs/getting-started
- Getting testnet tokens: https://testnet.gokite.ai/landing (faucet)

**✅ Test pass**

```
npx hardhat test
  Counter
    ✓ deploys with initial count of 0
    ✓ increments count by 1
    ✓ only increments, never decrements
  3 passing (800ms)

npx hardhat run scripts/deploy.ts --network kite_testnet
  Counter deployed to: 0x...
  Transaction hash: 0x...
```

Kite testnet explorer shows the contract address with verified bytecode. Repo has a clear `README.md` with setup instructions.

---

### Issue #2 — Project constants, interfaces, and shared types

**What to build**

Solidity interfaces and shared enums/structs that all contracts will import. A `IAgentMart.sol` interface file defining the data shapes for Orders, Bids, and Agents. No logic yet — just the type definitions the whole system depends on.

**How to build it**

Create a `contracts/interfaces/` directory. Define a `IAgentMart.sol` file that declares: an `OrderStatus` enum (Open, Matched, InProgress, Delivered, Disputed, Completed, Cancelled), a `BidStatus` enum (Active, Accepted, Rejected), an `Order` struct (orderId, buyer, itemDescription, budgetWei, deadline, location, status, acceptedBidId), a `Bid` struct (bidId, orderId, seller, priceWei, estimatedDelivery, reputationScore, status), and an `AgentProfile` struct (agentAddress, passportId, totalOrders, totalDisputes, reputationScore, isActive). These types will be imported by every contract going forward. Write a Hardhat test that simply compiles the interface and confirms the struct sizes are as expected using Hardhat's `ethers` ABI encoder — this ensures no naming conflicts or type errors.

**Resources**

- Solidity interfaces: https://docs.soliditylang.org/en/latest/contracts.html#interfaces
- Solidity structs and enums: https://docs.soliditylang.org/en/latest/types.html#structs
- Kite smart contracts list for reference patterns: https://docs.gokite.ai/kite-chain/3-developing/smart-contracts-list

**✅ Test pass**

```
npx hardhat compile
  Compiling 1 Solidity file
  Compilation finished successfully

npx hardhat test test/interfaces.test.ts
  Interfaces
    ✓ IAgentMart compiles without errors
    ✓ Order struct encodes and decodes correctly
    ✓ Bid struct encodes and decodes correctly
    ✓ OrderStatus enum has correct member count (7)
  4 passing (600ms)
```

---

### Issue #3 — Kite Agent Passport integration research spike

**What to build**

A research document (`docs/kite-passport-integration.md`) that maps out exactly how AgentMart will use Kite Agent Passport for buyer and seller identity. This is a non-code issue — its output is architectural clarity before writing any identity-related contract code.

**How to build it**

Read the Kite Agent Passport developer guide in full. Understand the three developer work modes: MCP integration, developer-as-end-user, and deep platform integration. For AgentMart, Mode 2 (developer as end user) is the target — you pay for services on behalf of users, they don't need their own passports for the MVP. Document: how passport registration works, what the passportId maps to on-chain, how x402 message passing works for agent-to-agent intents, and what calls the AgentMart contracts will need to make to reference a passport ID in order and bid structs. Write this as a markdown file in `docs/`. It becomes the reference for Issues #4 and #5.

**Resources**

- Kite Agent Passport developer guide: https://docs.gokite.ai/kite-agent-passport/developer-guide
- Kite Agent Passport introduction: https://docs.gokite.ai/kite-agent-passport/kite-agent-passport
- Kite x402 and A2A intents: https://docs.gokite.ai/get-started-why-kite/core-concepts-and-terminology
- Kite architecture pillars: https://docs.gokite.ai/get-started-why-kite/architecture-and-design-pillars

**✅ Test pass**

`docs/kite-passport-integration.md` exists and contains:
- A diagram or table of which AgentMart actions require passport verification
- The exact fields from the Kite Passport that will be stored in AgentMart's `AgentProfile` struct
- A decision on which developer work mode AgentMart will use for the hackathon MVP
- Notes on what is testnet-only vs mainnet-ready

---

## Phase 1 — Core Smart Contracts

---

### Issue #4 — AgentRegistry contract

**What to build**

A contract that registers buyer and seller agents on-chain, stores their Kite Passport ID, and maintains their reputation score. This is the identity layer for AgentMart — every participant must be registered before they can post orders or place bids.

**How to build it**

Create `contracts/AgentRegistry.sol`. It imports `IAgentMart.sol` for the `AgentProfile` struct. It exposes a `registerAgent(string passportId)` function that creates a new `AgentProfile` keyed by `msg.sender`, stores the passportId string, sets reputation to a baseline (e.g. 50 out of 100), and marks `isActive = true`. It reverts if the agent is already registered. Expose a `getAgent(address)` view function. Add an `isRegistered(address)` modifier that other contracts will use. Add an owner-only `deactivateAgent(address)` for dispute resolution. Use OpenZeppelin's `Ownable` for admin functions. Write full tests covering: registration success, duplicate registration revert, getAgent return, and deactivation.

**Resources**

- OpenZeppelin Ownable: https://docs.openzeppelin.com/contracts/4.x/access-control
- Kite Passport ID reference: https://docs.gokite.ai/kite-agent-passport/developer-guide
- OpenZeppelin install for Hardhat: https://hardhat.org/hardhat-runner/docs/guides/project-setup

**✅ Test pass**

```
npx hardhat test test/AgentRegistry.test.ts
  AgentRegistry
    ✓ registers a new agent with correct defaults
    ✓ stores passportId correctly
    ✓ reverts when registering an already-registered agent
    ✓ getAgent returns correct profile
    ✓ isRegistered returns true after registration
    ✓ owner can deactivate agent
    ✓ non-owner cannot deactivate agent (reverts)
    ✓ deactivated agent shows isActive = false
  8 passing (1.1s)
```

---

### Issue #5 — OrderBook contract

**What to build**

The demand-side heart of AgentMart. A contract where buyers post structured purchase requests. Each order has a budget locked in native token (USDC upgrade in Issue #18), a description, a deadline, and a status. This is the "I need X" board that supply agents monitor.

**How to build it**

Create `contracts/OrderBook.sol`. Import `IAgentMart.sol` and reference `AgentRegistry` for the `isRegistered` modifier. The `createOrder(string description, uint256 budgetWei, uint256 deadlineTimestamp, string location)` function accepts payment (native token for hackathon), generates a unique `orderId` using `keccak256(abi.encodePacked(msg.sender, block.timestamp, nonce))`, stores the Order struct, and emits an `OrderCreated` event. Add `cancelOrder(bytes32 orderId)` — only callable by the buyer if status is still `Open`. Add `getOrder(bytes32)` and `getOpenOrders(uint256 offset, uint256 limit)` view functions. The paginated `getOpenOrders` avoids unbounded gas costs. Use a `mapping(bytes32 => Order)` for storage and a `bytes32[]` array to track all order IDs.

**Resources**

- Solidity mappings and arrays: https://docs.soliditylang.org/en/latest/types.html#mappings
- Solidity events: https://docs.soliditylang.org/en/latest/contracts.html#events
- Gas optimization for storage arrays: https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html
- Kite stablecoin (USDC) integration for later upgrade: https://docs.gokite.ai/kite-chain/stablecoin-gasless-transfer

**✅ Test pass**

```
npx hardhat test test/OrderBook.test.ts
  OrderBook
    ✓ creates order with correct fields and emits OrderCreated
    ✓ orderId is unique per order
    ✓ stores order in mapping and id array
    ✓ getOpenOrders returns only Open status orders
    ✓ getOpenOrders respects pagination (offset, limit)
    ✓ buyer can cancel an Open order
    ✓ non-buyer cannot cancel order (reverts)
    ✓ cannot cancel a non-Open order (reverts)
    ✓ unregistered address cannot create order (reverts)
  9 passing (1.4s)
```

---

### Issue #6 — BidEngine + Escrow contract

**What to build**

The supply-side matching engine. Registered sellers submit bids on open orders. When the buyer accepts a bid, the `BidEngine` locks the order budget in escrow and transitions the order to `Matched` status. This is the core value exchange mechanism of AgentMart.

**How to build it**

Create `contracts/BidEngine.sol`. It holds references to `AgentRegistry` and `OrderBook`. The `placeBid(bytes32 orderId, uint256 priceWei, uint256 estimatedDelivery)` function checks the order is `Open`, the bidder is registered, and the bidder is not the buyer. It stores the bid and emits `BidPlaced`. The `acceptBid(bytes32 orderId, bytes32 bidId)` function is callable only by the order's buyer. It changes the order status to `Matched`, changes the bid status to `Accepted`, changes all other bids for that order to `Rejected`, and locks the buyer's budget into an internal escrow mapping (`mapping(bytes32 => uint256) escrowBalance`). Add `releaseEscrow(bytes32 orderId)` callable only by the buyer once they mark delivery confirmed — it sends funds to the seller. Add `refundEscrow(bytes32 orderId)` callable by owner in dispute cases. Inherit OpenZeppelin's `ReentrancyGuard` and apply the `nonReentrant` modifier to all fund-moving functions. Emit events for every state transition.

**Resources**

- Reentrancy guard (critical for escrow): https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard
- Solidity payable functions and `address.call`: https://docs.soliditylang.org/en/latest/types.html#address
- Check-Effects-Interactions pattern: https://docs.soliditylang.org/en/latest/security-considerations.html
- OpenZeppelin ReentrancyGuard source: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/ReentrancyGuard.sol

**✅ Test pass**

```
npx hardhat test test/BidEngine.test.ts
  BidEngine
    ✓ registered seller can place bid on open order
    ✓ buyer cannot bid on their own order (reverts)
    ✓ unregistered seller cannot bid (reverts)
    ✓ multiple bids can exist on same order
    ✓ buyer can accept a bid
    ✓ accepting bid locks correct amount in escrow
    ✓ accepting bid transitions order to Matched
    ✓ all other bids transition to Rejected on accept
    ✓ non-buyer cannot accept bid (reverts)
    ✓ buyer can release escrow after confirmation
    ✓ seller receives correct amount on release
    ✓ owner can refund escrow in dispute
    ✓ reentrancy attack on releaseEscrow is blocked
  13 passing (2.1s)
```

---

### Issue #7 — DeliveryTracker + ProtocolFee contract

**What to build**

A contract that records on-chain delivery milestones (Dispatched, InTransit, Delivered) posted by the seller, and a fee module that deducts the protocol fee (1% for hackathon) on every escrow release before paying the seller.

**How to build it**

Create `contracts/DeliveryTracker.sol`. It stores a `mapping(bytes32 => DeliveryMilestone[])` where `DeliveryMilestone` is a struct with `(status, timestamp, note)`. The `postMilestone(bytes32 orderId, string status, string note)` function is callable only by the accepted seller for that order. It appends to the milestone array and emits `MilestonePosted`. Buyers call `confirmDelivery(bytes32 orderId)` which internally calls `BidEngine.releaseEscrow`. Create `contracts/ProtocolFee.sol` as a small module: it holds a `feePercent` variable (100 = 1%), a `feeRecipient` address (your multisig or deployer wallet), and a `calculateFee(uint256 amount)` pure function. The `BidEngine.releaseEscrow` function calls `ProtocolFee.calculateFee` before splitting the payment: fee to `feeRecipient`, remainder to seller. Finish with a full end-to-end integration test simulating a complete order lifecycle across all contracts.

**Resources**

- Solidity dynamic arrays in structs: https://docs.soliditylang.org/en/latest/types.html#arrays
- Fixed-point fee math in Solidity: https://docs.soliditylang.org/en/latest/types.html#fixed-point-numbers
- Kite chain gasless integration (future upgrade): https://docs.gokite.ai/kite-chain/9-gasless-integration

**✅ Test pass**

```
npx hardhat test test/DeliveryTracker.test.ts
  DeliveryTracker
    ✓ seller can post Dispatched milestone
    ✓ seller can post InTransit milestone
    ✓ getMilestones returns full history in order
    ✓ non-seller cannot post milestone (reverts)
    ✓ buyer confirmDelivery triggers escrow release
    ✓ protocol fee (1%) deducted correctly on release
    ✓ seller receives 99% of bid price
    ✓ feeRecipient receives 1%
  8 passing (1.6s)

npx hardhat test test/integration/fullOrderLifecycle.test.ts
  Full order lifecycle
    ✓ buyer registers → posts order → seller bids → buyer accepts →
      seller posts milestones → buyer confirms → escrow releases correctly
  1 passing (3.2s)
```

---

## Phase 2 — Agent Layer (Backend)

---

### Issue #8 — Project backend scaffold (Node.js + TypeScript)

**What to build**

The `agents/` workspace initialized as a TypeScript Node.js project. A shared Kite chain client using `ethers.js` that connects to the Kite testnet and reads from the deployed contracts. Environment config with contract addresses loaded from a `deployments.json` file generated by the Hardhat deploy scripts.

**How to build it**

In the `agents/` workspace, initialize a TypeScript project with `ts-node`, `typescript`, and `ethers` (v6). Set up `tsconfig.json` targeting Node 18. Create a `src/chain/client.ts` module that exports a configured provider pointed at Kite testnet RPC and wallet instances for different agent roles (buyer, seller, protocol). Create a `src/chain/contracts.ts` module that imports the ABI from Hardhat's compiled artifacts and instantiates typed contract objects for `AgentRegistry`, `OrderBook`, `BidEngine`, `DeliveryTracker`. Generate TypeChain types from the contract ABIs so all contract calls are type-safe. Write a health check script that calls `getOpenOrders()` and prints the result to confirm connectivity.

**Resources**

- ethers.js v6 docs: https://docs.ethers.org/v6/
- TypeChain for typed contract bindings: https://github.com/dethcrypto/TypeChain
- Kite testnet RPC details: https://docs.gokite.ai/kite-chain/1-getting-started/network-information
- Hardhat artifacts for ABI export: https://hardhat.org/hardhat-runner/docs/advanced/artifacts

**✅ Test pass**

```
npx ts-node src/scripts/healthCheck.ts
  ✓ Connected to Kite testnet (chainId: XXXX)
  ✓ AgentRegistry at 0x... responds to call
  ✓ OrderBook at 0x... getOpenOrders() returns [] (empty, correct)
  ✓ All contract instances initialized without error
```

---

### Issue #9 — DemandAgent — natural language order parser

**What to build**

A Node.js agent service (`DemandAgent`) that accepts a natural language string from the buyer UI, parses it into a structured `OrderSpec` (item, budget, deadline, location), and submits it as an on-chain order via `OrderBook.createOrder`. This is the "I need X" parser that makes AgentMart feel like chatting rather than filling a form.

**How to build it**

Create `agents/src/agents/DemandAgent.ts`. Use the Anthropic API (claude-sonnet-4-20250514) with tool use / structured output to extract: `itemDescription` (string), `budgetNative` (number in ETH units), `deadlineDays` (integer), and `location` (string). Define a JSON schema for the extraction output and validate it with `zod`. On successful parse, call `OrderBook.createOrder` with the extracted fields, converting `budgetNative` to `BigInt` wei. Emit a success event with the generated `orderId`. Add input validation: budget must be > 0, deadline must be > now, description must be >= 10 chars. Write unit tests using mocked LLM responses (no real API calls in CI) that cover the happy path and edge cases.

**Resources**

- Anthropic tool use / structured outputs: https://docs.anthropic.com/en/docs/build-with-claude/tool-use
- Zod schema validation: https://zod.dev
- ethers BigInt conversion: https://docs.ethers.org/v6/api/utils/#parseEther
- OpenAI function calling (alternative): https://platform.openai.com/docs/guides/function-calling

**✅ Test pass**

```
npx jest agents/src/agents/DemandAgent.test.ts
  DemandAgent
    ✓ parses "I need 3kg of rice delivered by Friday under ₦8000" correctly
    ✓ extracted itemDescription matches expected
    ✓ extracted budgetNative is positive number
    ✓ extracted deadlineDays is integer > 0
    ✓ rejects input with budget = 0
    ✓ rejects input with description under 10 chars
    ✓ submits parsed order to OrderBook (mocked contract)
    ✓ returns orderId on success
  8 passing (900ms)
```

---

### Issue #10 — SupplyAgent — order monitor + auto-bidder

**What to build**

A Node.js agent service (`SupplyAgent`) that represents a registered seller. It polls the `OrderBook` for open orders matching a configurable interest profile (categories, max budget, location), evaluates each order, and autonomously places a bid with a computed price and ETA. This is the supply side of the agentic marketplace — sellers deploy this and it bids on their behalf.

**How to build it**

Create `agents/src/agents/SupplyAgent.ts`. It takes a configuration object: `sellerWallet`, `categories` (array of strings), `maxBudgetWei`, `location`, `bidMarginPercent` (default: seller bids at 90% of buyer's budget). On a configurable polling interval (default 30s using `setInterval`), it calls `OrderBook.getOpenOrders(0, 20)`, filters orders by category match and budget threshold, and for each matching order checks if the seller has already bid (by querying `BidEngine.getBidsForOrder`). If not, it constructs a bid: price = buyer budget × (1 - bidMarginPercent/100), ETA = current time + 48h. It calls `BidEngine.placeBid` with these values. Logs all actions to a structured JSON log. Write integration tests against a local Hardhat node (not testnet) that simulate the full polling cycle.

**Resources**

- ethers.js event listening (alternative to polling): https://docs.ethers.org/v6/api/providers/#Provider-on
- Node.js setInterval and async patterns: https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick
- Hardhat in-process network for integration tests: https://hardhat.org/hardhat-network/docs/overview

**✅ Test pass**

```
npx jest agents/src/agents/SupplyAgent.test.ts
  SupplyAgent
    ✓ initializes with correct configuration
    ✓ polls open orders on interval
    ✓ filters orders by matching category
    ✓ filters orders by max budget
    ✓ skips orders already bid on
    ✓ places bid at correct computed price (90% of budget)
    ✓ bid ETA is set to 48h from now
    ✓ logs action to structured JSON output
  8 passing (1.2s)
```

---

### Issue #11 — MatchingAgent + RampAgent skeleton

**What to build**

Two additional agent services: `MatchingAgent` listens for `BidPlaced` events and scores each bid using a composite formula (price, ETA, seller reputation), then notifies the buyer. `RampAgent` is a skeleton service that wraps MoonPay/Transak API — for this issue it validates that fiat → stablecoin quotes can be fetched and logs the best rate. Full ramp execution comes in Issue #12.

**How to build it**

`MatchingAgent`: Create `agents/src/agents/MatchingAgent.ts`. Use ethers.js event listeners on the `BidEngine` contract to subscribe to `BidPlaced(orderId, bidId, seller, price, eta)` events. On each event, fetch all bids for that order and score them using the formula: `score = (0.5 × priceScore) + (0.3 × etaScore) + (0.2 × reputationScore)` where each component is normalized to 0–1 across all bids for that order. Sort descending. Write ranked bid data to a Redis key or simple JSON file that the frontend can poll.

`RampAgent`: Create `agents/src/agents/RampAgent.ts`. Load MoonPay and Transak API keys from `.env`. Expose a `getOnrampQuote(fiatAmount, fiatCurrency, targetStablecoin)` async function that calls both APIs in parallel via `Promise.all`, compares net amounts, and returns the better provider. Write tests using mocked API responses.

**Resources**

- ethers.js contract event subscriptions: https://docs.ethers.org/v6/api/contract/#Contract-on
- MoonPay widget and API docs: https://dev.moonpay.com/docs
- Transak SDK docs: https://docs.transak.com/docs/getting-started
- Redis for Node.js (ioredis): https://github.com/redis/ioredis

**✅ Test pass**

```
npx jest agents/src/agents/MatchingAgent.test.ts
  MatchingAgent
    ✓ subscribes to BidPlaced events
    ✓ scores bids by composite formula
    ✓ ranks 3 bids in correct descending order
    ✓ highest score bid has lowest price + best ETA + highest rep
  4 passing (700ms)

npx jest agents/src/agents/RampAgent.test.ts
  RampAgent
    ✓ fetches MoonPay quote (mocked)
    ✓ fetches Transak quote (mocked)
    ✓ returns provider with better net rate
    ✓ handles API failure gracefully with fallback
  4 passing (600ms)
```

---

## Phase 3 — Ramp Integration + Frontend

---

### Issue #12 — RampAgent full integration (MoonPay + Transak)

**What to build**

The full onramp/offramp flow. A buyer initiates a purchase in fiat — the RampAgent picks the best provider, generates an onramp widget URL, the buyer completes fiat payment through the provider UI, the provider sends a webhook confirming USDC has landed in the buyer's wallet, and the RampAgent then calls `OrderBook.createOrder` with the received funds.

**How to build it**

Extend `RampAgent` with a full webhook listener using an Express.js endpoint at `/ramp/webhook`. Handle MoonPay's `transaction_completed` webhook and Transak's `ORDER_COMPLETED` webhook. Verify webhook signatures using HMAC with the provider's shared secret — never accept unverified webhooks. On confirmed completion, parse the received USDC amount and call `OrderBook.createOrder`. For the offramp (seller payout): after `BidEngine.releaseEscrow`, call the Transak or MoonPay offramp API to initiate a USDC → bank transfer with the seller's bank details (stored off-chain only, never on-chain). Test using provider sandbox environments — both MoonPay and Transak have dedicated sandbox modes with test cards.

**Resources**

- MoonPay webhook verification: https://dev.moonpay.com/docs/webhooks
- Transak webhook docs: https://docs.transak.com/docs/webhooks
- MoonPay sandbox environment: https://dev.moonpay.com/docs/sandbox
- Transak staging environment: https://docs.transak.com/docs/staging-environment
- Express.js webhook handler pattern: https://expressjs.com/en/guide/routing.html

**✅ Test pass**

```
npx jest agents/src/agents/RampAgent.integration.test.ts
  RampAgent integration (sandbox)
    ✓ generates valid MoonPay onramp URL with correct params
    ✓ verifies incoming MoonPay webhook HMAC signature correctly
    ✓ rejects webhook with invalid signature (401)
    ✓ on ORDER_COMPLETED fires OrderBook.createOrder with correct amount
    ✓ generates Transak offramp request for seller payout
    ✓ handles provider downtime with queued retry (3 attempts, exponential backoff)
  6 passing (2.8s)
```

---

### Issue #13 — Next.js frontend scaffold + wallet connection

**What to build**

A Next.js 14 (App Router) frontend in the `frontend/` workspace. Pages: Home (browse open orders), Post a Request (buyer demand form), My Orders (order status tracking), and Agent Dashboard (seller bid management). Wallet connection configured for Kite testnet. Read-only order browsing works without wallet connection.

**How to build it**

Initialize `frontend/` with `create-next-app` using TypeScript and Tailwind CSS. Install `wagmi`, `viem`, and `@rainbow-me/rainbowkit`. Configure wagmi with the Kite testnet chain definition — use the network info from Kite docs to build a custom chain object with the correct `id`, `rpcUrls`, and `nativeCurrency`. On the home page, use a `wagmi` `useReadContract` hook to call `OrderBook.getOpenOrders(0, 10)` and render order cards. Each card shows: item description, budget, deadline, number of bids, and order status badge. Add a navigation bar with the wallet connect button. The app loads and displays orders in read-only mode without a connected wallet.

**Resources**

- Next.js App Router: https://nextjs.org/docs/app
- RainbowKit setup: https://www.rainbowkit.com/docs/installation
- wagmi custom chains: https://wagmi.sh/core/chains
- Kite testnet chain parameters: https://docs.gokite.ai/kite-chain/1-getting-started/network-information
- Tailwind CSS: https://tailwindcss.com/docs/installation

**✅ Test pass**

```
Open browser at http://localhost:3000
  ✓ Home page loads without errors or console warnings
  ✓ "Connect Wallet" button appears in nav
  ✓ Connecting MetaMask with Kite testnet network works
  ✓ getOpenOrders() call succeeds (empty state message shown when 0 orders)
  ✓ Order cards display description, budget, and deadline correctly
  ✓ All 4 routes resolve without 404: /, /post, /orders, /dashboard
```

---

### Issue #14 — Buyer flow: post order + ramp widget

**What to build**

The complete buyer journey. A multi-step form where the buyer types their request in natural language, the DemandAgent API parses it, a preview of the structured order is shown for confirmation, the RampAgent shows the best fiat payment option (MoonPay/Transak widget), and after payment confirmation the order appears on-chain and the buyer is redirected to their order tracking page.

**How to build it**

On the `/post` route, build a three-step form. Step 1: a natural language textarea and a "Parse my request" button that calls the DemandAgent backend via `fetch`. Step 2: a confirmation card showing the parsed `itemDescription`, `budget`, `deadline`, and `location` with an edit-and-reparse option. Step 3: embed the ramp payment widget — MoonPay as a hosted URL in an iframe, or Transak's React widget component. On payment confirmation (your backend emits a Server-Sent Event to the frontend via a `/events` endpoint), navigate to `/orders/[orderId]`. Use `react-hook-form` for form state and `zod` for client-side validation matching the agent-side schema.

**Resources**

- MoonPay React widget: https://dev.moonpay.com/docs/widget
- Transak React SDK: https://docs.transak.com/docs/react-sdk
- react-hook-form: https://react-hook-form.com/get-started
- Next.js Route Handlers for SSE: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- wagmi useWriteContract hook: https://wagmi.sh/react/api/hooks/useWriteContract

**✅ Test pass**

```
Manual E2E flow on Kite testnet sandbox:
  Step 1: Type "I need a laptop bag delivered to Lagos by next Monday under $20"
          → Parse button fires → structured preview shows correctly
  Step 2: Confirm order details match parsed output
  Step 3: MoonPay sandbox widget loads without CORS errors
  Step 4: Complete sandbox payment → webhook fires → order appears on-chain
  Step 5: Browser redirects to /orders/[orderId] with status badge = Open
  ✓ All 5 steps complete without errors
```

---

### Issue #15 — Seller flow: bid submission + delivery milestone UI

**What to build**

The seller-facing `/dashboard`. A seller sees all open orders, views AI-scored bids, submits a manual bid or relies on their SupplyAgent to auto-bid, and after being matched posts delivery milestones. The buyer's `/orders/[orderId]` page shows live milestone updates polling every 15 seconds.

**How to build it**

On `/dashboard`, use `wagmi` hooks to read open orders and the seller's active bids. Build a tabbed view: "Open Orders" (available to bid on), "Active Bids" (awaiting buyer decision), "Matched Orders" (to fulfill). On each matched order card, show a milestone widget: a status dropdown (Dispatched / InTransit / Delivered) and a notes text input. Submitting calls `DeliveryTracker.postMilestone` via `useWriteContract`. On the buyer's `/orders/[orderId]` page, display a vertical milestone timeline using `useReadContract` with `refetchInterval: 15000`. When the latest milestone is Delivered, enable a "Confirm & Release Payment" button that calls `DeliveryTracker.confirmDelivery`. Show an escrow amount and a "You will receive" breakdown (99% to seller, 1% fee displayed clearly).

**Resources**

- wagmi useReadContract with refetchInterval: https://wagmi.sh/react/api/hooks/useReadContract
- wagmi useWriteContract: https://wagmi.sh/react/api/hooks/useWriteContract
- ethers event log decoding: https://docs.ethers.org/v6/api/abi/#Interface-parseLog

**✅ Test pass**

```
Manual E2E flow (seller side on Kite testnet):
  ✓ Seller wallet connects on /dashboard
  ✓ Buyer's posted order appears in Open Orders tab
  ✓ Seller submits manual bid → BidPlaced event fires → bid in Active Bids tab
  ✓ Buyer accepts bid → order transitions to Matched in both UIs
  ✓ Seller posts Dispatched milestone → appears in buyer timeline within 15s
  ✓ Seller posts Delivered milestone → buyer sees Confirm & Release button
  ✓ Buyer confirms → escrow releases → seller balance increases → 1% fee deducted
  ✓ Payment breakdown shown correctly before confirmation
```

---

## Phase 4 — Integration, Polish & Submission

---

### Issue #16 — End-to-end testnet run + bug fixes

**What to build**

A complete end-to-end run of the full AgentMart flow on Kite Ozone testnet with real testnet tokens, real MoonPay/Transak sandbox, real contract calls, and all three agent services running simultaneously. Document every bug in `BUGS.md` and fix it before submission.

**How to build it**

Deploy all contracts fresh to Kite testnet using a clean deployment script that outputs `deployments/kite_testnet.json` with all contract addresses and tx hashes. Start the full agents service stack. Start the frontend. Run through the complete buyer-seller cycle three times with different wallet pairs. Keep a `BUGS.md` log. Known areas to stress test: gas estimation on Kite vs Hardhat local (can differ), BigInt serialization between frontend and backend, webhook delivery timing under testnet latency, CORS on the agent API when called from the Next.js frontend, and event listener reconnection after RPC drops.

**Resources**

- Kite testnet faucet: https://testnet.gokite.ai/landing
- Kite block explorer and tools: https://docs.gokite.ai/kite-chain/1-getting-started/tools
- Goldsky for event indexing (optional): https://docs.gokite.ai/kite-chain/11-goldsky-kite-integration
- LayerZero bridge integration (optional): https://docs.gokite.ai/kite-chain/10-layerzero-kite-integration

**✅ Test pass**

```
Full testnet run checklist (all must be green before submission):
  ✓ Fresh deployment to testnet completes without error
  ✓ All contract addresses confirmed on Kite block explorer
  ✓ Buyer wallet funded from faucet, registration succeeds
  ✓ Seller wallet funded from faucet, registration succeeds
  ✓ Buyer posts order via frontend → orderId confirmed on explorer
  ✓ SupplyAgent auto-bids within 60s of order creation
  ✓ Buyer accepts bid via frontend → escrow locks (confirmed on-chain)
  ✓ Seller posts 3 milestones → all appear in buyer timeline
  ✓ Buyer confirms delivery → escrow releases → 1% fee to feeRecipient
  ✓ No unhandled errors in browser console throughout
  ✓ All agent service logs show structured JSON with no exceptions
```

---

### Issue #17 — Submission polish: README, demo video, and hackathon docs

**What to build**

Everything the judges need: a polished `README.md`, a `DEMO.md` walkthrough script, an `ARCHITECTURE.md`, a 3–5 minute recorded demo video, and a submitted entry on the Encode Club hackathon portal before the April 26 deadline.

**How to build it**

`README.md`: project name, one-liner, the problem it solves, tech stack badge table, local setup in three commands (install → start agents → start frontend), link to live demo, link to video. `ARCHITECTURE.md`: reference the architecture from the original design — explain each layer (contracts, agents, ramp, frontend), which Kite primitives are used (Agent Passport, x402, PoAI reputation), and the revenue model. `DEMO.md`: a timestamped script for the video. Structure: 30s problem statement, 60s live order creation with natural language input, 30s auto-bidding by SupplyAgent, 30s buyer accepts bid, 30s milestone tracking, 30s payment release, 30s closing on startup vision. Submit on the Encode Club portal with repo link, video link, and a 200-word project description that emphasizes: demand-first marketplace, fiat abstraction via agent-orchestrated ramps, and the startup roadmap post-hackathon.

**Resources**

- Encode Club submission portal: https://www.encodeclub.com/programmes/kites-hackathon-ai-agentic-economy
- Kite ecosystem context for judging: https://docs.gokite.ai/get-started-why-kite/key-use-cases-and-players
- Loom for screen recording: https://loom.com

**✅ Test pass**

```
Submission checklist (all required):
  ✓ README.md setup instructions tested on a fresh machine/clone
  ✓ ARCHITECTURE.md references all 5 agents and all 4 contracts
  ✓ Demo video is between 3 and 5 minutes
  ✓ Demo video shows full order lifecycle end-to-end
  ✓ All contract addresses in README point to live Kite testnet
  ✓ GitHub repo is public and has a clear commit history
  ✓ Encode Club submission form completed before April 26 23:59 UTC
  ✓ Submission includes: repo link, demo video link, 200-word description
```

---

### Issue #18 — Post-hackathon: USDC upgrade + mainnet prep

**What to build**

Upgrade the contracts from native token escrow to USDC (Kite's native stablecoin). Prepare for Kite mainnet deployment. This issue is post-hackathon but is documented here as the bridge from demo to production startup.

**How to build it**

Replace `msg.value` in `OrderBook.createOrder` and `BidEngine.releaseEscrow` with ERC-20 `transferFrom` / `transfer` calls against the Kite USDC contract address. Use OpenZeppelin's `IERC20` interface. Update the frontend to add an `approve` step before `createOrder` (call USDC `approve` on the OrderBook contract address, then `createOrder`). Update all tests to use a mock ERC-20. For mainnet prep: integrate the Kite gasless relayer so buyers don't pay gas manually. Integrate the Kite Account Abstraction SDK to remove wallet signing friction. Register AgentMart as a Kite module by locking the required KITE tokens per the tokenomics docs.

**Resources**

- Kite stablecoin (USDC) transfer docs: https://docs.gokite.ai/kite-chain/stablecoin-gasless-transfer
- Kite gasless integration: https://docs.gokite.ai/kite-chain/9-gasless-integration
- Kite Account Abstraction SDK: https://docs.gokite.ai/kite-chain/account-abstraction-sdk
- OpenZeppelin ERC-20 interface: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20
- Kite module registration (tokenomics): https://docs.gokite.ai/get-started-why-kite/tokenomics

**✅ Test pass**

```
npx hardhat test test/USDC_upgrade.test.ts
  USDC Upgrade
    ✓ OrderBook accepts ERC-20 USDC instead of native token
    ✓ createOrder calls transferFrom correctly
    ✓ insufficient USDC allowance reverts with correct message
    ✓ releaseEscrow sends USDC to seller (not native token)
    ✓ 1% fee deducted in USDC and sent to feeRecipient
  5 passing (1.3s)

Mainnet readiness checklist (track post-hackathon):
  [ ] Kite mainnet RPC confirmed in hardhat.config.ts
  [ ] KITE tokens acquired for module registration
  [ ] Gasless relayer configured and smoke-tested
  [ ] Account Abstraction SDK integrated and tested on frontend
  [ ] Security review of all fund-moving functions completed
  [ ] BUGS.md from Issue #16 fully resolved
```

---

## Summary — Issue Index

| # | Issue | Phase | Output |
|---|---|---|---|
| 1 | Hardhat + Kite testnet setup | 0 | Counter.sol, hardhat.config.ts |
| 2 | Interfaces and shared types | 0 | IAgentMart.sol |
| 3 | Kite Passport research spike | 0 | docs/kite-passport-integration.md |
| 4 | AgentRegistry contract | 1 | AgentRegistry.sol |
| 5 | OrderBook contract | 1 | OrderBook.sol |
| 6 | BidEngine + Escrow | 1 | BidEngine.sol |
| 7 | DeliveryTracker + ProtocolFee | 1 | DeliveryTracker.sol, ProtocolFee.sol |
| 8 | Backend scaffold + chain client | 2 | agents/src/chain/ |
| 9 | DemandAgent | 2 | agents/src/agents/DemandAgent.ts |
| 10 | SupplyAgent | 2 | agents/src/agents/SupplyAgent.ts |
| 11 | MatchingAgent + RampAgent skeleton | 2 | agents/src/agents/ × 2 |
| 12 | RampAgent full integration | 3 | MoonPay + Transak webhooks |
| 13 | Next.js scaffold + wallet | 3 | frontend/ |
| 14 | Buyer flow UI | 3 | frontend/app/post/ |
| 15 | Seller flow UI | 3 | frontend/app/dashboard/ |
| 16 | E2E testnet run + bug fixes | 4 | BUGS.md, all services stable |
| 17 | Submission polish | 4 | README, ARCHITECTURE, video |
| 18 | USDC upgrade + mainnet prep | post-hack | contracts v2, mainnet config |

---

*Built for Kite AI Global Hackathon 2026 — Encode Club — Agentic Commerce Track*  
*AgentMart: The demand-first agentic commerce network.*

# AgentMart

**The Demand-First Agentic Commerce Network Built on Kite AI.**

![AgentMart Banner](https://placehold.co/1200x400/2563eb/ffffff?text=AgentMart+-+Kite+AI+Global+Hackathon+2026)

*A submission for the **Kite AI Global Hackathon 2026** — Agentic Commerce Track.*

## 🚀 Overview

AgentMart flips traditional e-commerce on its head. Instead of buyers scrolling through endless catalogs, **buyers simply declare their demand in natural language**, and autonomous AI agents fight to fulfill it via on-chain bids. 

We leverage **Kite AI's payment blockchain** to allow autonomous agents to negotiate, settle, and track real-world deliveries entirely on-chain, creating a frictionless, trustless, and zero-gas experience for the end user.

### Why AgentMart wins the Agentic Commerce Track:
- **Agent Autonomy**: Zero human involvement on the supply side. `SupplyAgent` evaluates orders, checks category constraints, computes margins, and bids automatically.
- **Kite Ecosystem Alignment**: Deeply integrated with Kite primitives. We implemented **EIP-3009 gasless transactions** and **x402 payment intents** directly into the agent workflows.
- **Real-World Applicability**: Solves the biggest hurdle in web3 commerce: UX. Buyers pay in fiat (MoonPay/Transak), agents relay the gasless stablecoin (USDC) transaction to the Kite Ozone testnet.

---

## 🏗 Architecture & Features

AgentMart consists of three main layers: **Smart Contracts**, the **Agent Layer**, and the **Next.js Frontend**.

### 1. Agent Layer (Node.js/Express)
Four distinct autonomous agents power the network:
- **DemandAgent**: Uses the Gemini API (Google LLM) to parse raw natural language requests ("I need a laptop bag in Lagos for $15") into a deterministic JSON schema.
- **SupplyAgent**: A background worker that monitors the `OrderBook` smart contract. It automatically places competitive bids (e.g., 90% of the buyer's budget) on orders matching the seller's category profile.
- **MatchingAgent**: Listens for `BidPlaced` events, ranks bids using a multi-variable algorithm (Price, ETA, Reputation), and generates **x402 approve_payment payloads** upon acceptance.
- **RampAgent**: Abstracting crypto entirely. It receives MoonPay fiat webhooks, grabs the buyer's EIP-3009 signature from Redis, and acts as a relayer—paying the Kite gas fee to execute `OrderBook.createOrderGasless`.

### 2. Smart Contracts (Solidity)
Deployed on the **Kite Ozone Testnet**.
- **AgentRegistry**: Manages Kite Agent Passport identities and PoAI reputation scores.
- **OrderBook**: Holds escrowed USDC, tracks `OrderStatus`, and natively supports EIP-3009 `transferWithAuthorization`.
- **BidEngine**: Handles competitive bidding from registered SupplyAgents.
- **DeliveryTracker**: Manages real-world fulfillment milestones ("Dispatched", "Delivered") and triggers the `OrderBook` to release the escrow.
- **ProtocolFee**: A modular fee engine (1%) applied to completed orders.

### 3. Frontend (Next.js + Tailwind + Wagmi)
A consumer-grade Web3 application:
- **Buyer Flow**: Natural language input → EIP-712 Signature → MoonPay Fiat iframe → Order Live.
- **Seller Dashboard**: Real-time view of the `SupplyAgent` terminal logs and global order book.

---

## ⚙️ Judging Criteria & Reproducibility

### 1. End-to-End Live Demo (Vercel)
*Insert Vercel Link Here before submission*

### 2. Reproducing Locally
To spin up the entire AgentMart ecosystem locally:

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/agentmart.git
cd agentmart

# 2. Start local Hardhat Node & Deploy Contracts
cd contracts
npm install
npx hardhat node
# In a new terminal:
npx hardhat run scripts/deploy/full.ts --network localhost

# 3. Start Agent Backend
cd ../agents
npm install
# Ensure you have a .env with GEMINI_API_KEY and Redis running locally
npm run start

# 4. Start Next.js Frontend
cd ../frontend
npm install
npm run dev
```

### 3. Video Demo
*Insert YouTube/Loom Link Here before submission*
The video demonstrates:
1. A buyer typing a natural language request.
2. The DemandAgent structuring it.
3. The gasless signature + fiat webhook relay.
4. The SupplyAgent auto-bidding in the background.
5. Escrow release.

---

## 🔮 What's Next (Post-Hackathon)
1. **Full Kite Passport Integration**: Moving from our Mode 2 MVP stub to full OAuth Session checks via the Kite Account Abstraction SDK.
2. **Mainnet Deployment**: Migrating contracts to Kite Mainnet and replacing `Ownable` with Gnosis Safe multisigs.

**Team**: Victor Ezealor  
**Track**: Agentic Commerce  
**Join Code**: 67cb07fb
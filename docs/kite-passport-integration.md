# Kite Agent Passport Integration Strategy

This document maps out how AgentMart uses Kite Agent Passport for buyer and seller identity.

## Developer Work Mode: Mode 2 MVP
For the hackathon MVP, AgentMart implements **Mode 2 (Developer as End User)**.
- The developer holds the sole Passport and pays on behalf of users (buyers/sellers).
- Since Mode 2 SDK/API is currently "Coming Soon" in Kite docs, we use a **developer Passport only** approach for the MVP.
- Real verification via Kite MCP Session check will be implemented post-hackathon.

**Important Note for Judges:**
Real testnet registration may require an invite link for the Kite Agent Passport on testnet. Our MVP stubs this out by utilizing the developer's fixed Passport ID.

## Identity Flow & Actions Requiring Passport Verification

| Action | Agent Role | Verification Method (MVP) | Verification Method (Post-Hackathon) |
| --- | --- | --- | --- |
| **Register on AgentMart** | Buyer & Seller | `isValidPassport` stub returns true | Kite Passport API session validation |
| **Create Order** | Buyer | Verified at registration + Wallet Signature / EIP-3009 | Checked against Passport session |
| **Place Bid** | Seller | Verified at registration | Checked against Passport session |
| **Accept Bid** | Buyer | Verified at registration + Wallet | Checked against Passport session |

## AgentProfile Struct Fields

The exact fields stored in the `AgentProfile` struct on-chain are:

```solidity
struct AgentProfile {
    address agentAddress;      // The wallet address interacting with contracts
    string passportId;         // The Kite Passport ID (Developer's ID for MVP)
    uint256 totalOrders;       // Track successful interactions
    uint256 totalDisputes;     // Track disputes
    uint256 reputationScore;   // Internal reputation system (starts at 50/100)
    bool isActive;             // Active status flag
}
```

## Testnet vs. Mainnet Readiness

### Testnet MVP (Current)
- `AgentRegistry.sol` stores the developer's fixed Passport ID.
- `isValidPassport(string memory)` is a view function that always returns true.
- Gasless transactions use EIP-3009 (`transferWithAuthorization`) with the RampAgent acting as the relayer, providing a true Mode 2 "no-wallet UX" for order creation.

### Mainnet Ready (Post-Hackathon)
- Replace `Ownable` modifiers with a Gnosis Safe multisig.
- Add off-chain calls to Kite Passport API to validate sessions before registration.
- Store both `passportId` and `sessionId` in the `AgentProfile`.
- Fully integrate the Kite Account Abstraction SDK.

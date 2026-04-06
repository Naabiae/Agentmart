# Kite Ozone Testnet Configuration

To connect Hardhat, wagmi, and your agent backend to the Kite Ozone Testnet, use the following canonical values.

**Network Name:** Kite Ozone Testnet
**RPC URL:** `https://testnet.ozone.rpc.gokite.ai` *(Note: Please verify with latest docs)*
**Chain ID:** `2368` *(Note: Please verify with latest docs)*
**Currency Symbol:** `KITE`
**Block Explorer URL:** `https://testnet.ozone.explorer.gokite.ai`

## Hardhat Integration
In `hardhat.config.ts`, set up the network as follows:
```typescript
kite_testnet: {
  url: process.env.KITE_TESTNET_RPC || "https://testnet.ozone.rpc.gokite.ai",
  chainId: process.env.KITE_TESTNET_CHAIN_ID ? parseInt(process.env.KITE_TESTNET_CHAIN_ID) : 2368,
  accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
}
```

## Faucet
Get testnet KITE tokens at: https://testnet.gokite.ai/landing

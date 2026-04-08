import { type Chain } from 'viem'

export const kiteTestnet = {
  id: process.env.NEXT_PUBLIC_CHAIN_ID ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID) : 2368,
  name: 'Kite Ozone Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KITE',
    symbol: 'KITE',
  },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.ozone.rpc.gokite.ai'] },
    public: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.ozone.rpc.gokite.ai'] },
  },
  blockExplorers: {
    default: { name: 'Kite Explorer', url: 'https://testnet.ozone.explorer.gokite.ai' },
  },
  testnet: true,
} as const satisfies Chain

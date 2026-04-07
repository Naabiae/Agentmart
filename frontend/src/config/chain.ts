import { type Chain } from 'viem'

export const kiteTestnet = {
  id: 2368,
  name: 'Kite Ozone Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'KITE',
    symbol: 'KITE',
  },
  rpcUrls: {
    default: { http: ['https://testnet.ozone.rpc.gokite.ai'] },
    public: { http: ['https://testnet.ozone.rpc.gokite.ai'] },
  },
  blockExplorers: {
    default: { name: 'Kite Explorer', url: 'https://testnet.ozone.explorer.gokite.ai' },
  },
  testnet: true,
} as const satisfies Chain

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    kite_testnet: {
      url: process.env.KITE_TESTNET_RPC || "https://testnet.ozone.rpc.gokite.ai",
      chainId: process.env.KITE_TESTNET_CHAIN_ID ? parseInt(process.env.KITE_TESTNET_CHAIN_ID) : 2368,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;

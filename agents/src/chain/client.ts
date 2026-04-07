import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../contracts/.env") });

export const getProvider = () => {
    const rpcUrl = process.env.KITE_TESTNET_RPC || "https://testnet.ozone.rpc.gokite.ai";
    return new ethers.JsonRpcProvider(rpcUrl);
};

export const getWallet = (privateKey?: string) => {
    const pk = privateKey || process.env.PRIVATE_KEY;
    if (!pk) throw new Error("Private key not found");
    return new ethers.Wallet(pk, getProvider());
};

export const getDeployments = () => {
    const deploymentsPath = path.resolve(__dirname, "../../../deployments/kite_testnet.json");
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error("Deployments file not found. Run hardhat deploy first.");
    }
    return JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
};

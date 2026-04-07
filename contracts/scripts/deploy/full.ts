import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // 1. Deploy USDC (Using MockUSDC for testnet unless real address is provided)
  const usdcAddress = process.env.USDC_ADDRESS || "mock";
  let finalUsdcAddress = usdcAddress;
  
  if (usdcAddress === "mock") {
    const USDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await USDC.deploy();
    await usdc.waitForDeployment();
    finalUsdcAddress = await usdc.getAddress();
    console.log(`MockUSDC deployed to: ${finalUsdcAddress}`);
  } else {
    console.log(`Using existing USDC at: ${finalUsdcAddress}`);
  }

  // 2. Deploy AgentRegistry
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log(`AgentRegistry deployed to: ${agentRegistryAddress}`);

  // 3. Deploy OrderBook
  const OrderBook = await ethers.getContractFactory("OrderBook");
  const orderBook = await OrderBook.deploy(finalUsdcAddress, agentRegistryAddress);
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log(`OrderBook deployed to: ${orderBookAddress}`);

  // 4. Deploy ProtocolFee (1% fee, sent to deployer for now)
  const feePercent = 100; // 1%
  const ProtocolFee = await ethers.getContractFactory("ProtocolFee");
  const protocolFee = await ProtocolFee.deploy(feePercent, deployer.address);
  await protocolFee.waitForDeployment();
  const protocolFeeAddress = await protocolFee.getAddress();
  console.log(`ProtocolFee deployed to: ${protocolFeeAddress}`);

  // 5. Deploy BidEngine
  const BidEngine = await ethers.getContractFactory("BidEngine");
  const bidEngine = await BidEngine.deploy(agentRegistryAddress, orderBookAddress);
  await bidEngine.waitForDeployment();
  const bidEngineAddress = await bidEngine.getAddress();
  console.log(`BidEngine deployed to: ${bidEngineAddress}`);

  // 6. Deploy DeliveryTracker
  const DeliveryTracker = await ethers.getContractFactory("DeliveryTracker");
  const deliveryTracker = await DeliveryTracker.deploy(orderBookAddress, bidEngineAddress);
  await deliveryTracker.waitForDeployment();
  const deliveryTrackerAddress = await deliveryTracker.getAddress();
  console.log(`DeliveryTracker deployed to: ${deliveryTrackerAddress}`);

  // 7. Wire the contracts (Resolving circular dependencies and setting permissions)
  console.log("Wiring contracts...");
  await (await orderBook.setBidEngine(bidEngineAddress)).wait();
  await (await orderBook.setDeliveryTracker(deliveryTrackerAddress)).wait();
  await (await orderBook.setProtocolFee(protocolFeeAddress)).wait();
  await (await bidEngine.setDeliveryTracker(deliveryTrackerAddress)).wait();
  console.log("Contracts wired successfully.");

  // 8. Save deployment addresses
  const deployments = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    usdc: finalUsdcAddress,
    agentRegistry: agentRegistryAddress,
    orderBook: orderBookAddress,
    protocolFee: protocolFeeAddress,
    bidEngine: bidEngineAddress,
    deliveryTracker: deliveryTrackerAddress,
  };

  const dir = path.join(__dirname, "../../../deployments");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const file = path.join(dir, "kite_testnet.json");
  fs.writeFileSync(file, JSON.stringify(deployments, null, 2));
  console.log(`Deployment addresses saved to: ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

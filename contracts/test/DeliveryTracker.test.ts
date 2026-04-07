import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry, OrderBook, BidEngine, MockUSDC, ProtocolFee, DeliveryTracker } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("DeliveryTracker", function () {
  let agentRegistry: AgentRegistry;
  let orderBook: OrderBook;
  let bidEngine: BidEngine;
  let protocolFee: ProtocolFee;
  let deliveryTracker: DeliveryTracker;
  let usdc: MockUSDC;
  
  let owner: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;
  
  let orderId: string;

  beforeEach(async function () {
    [owner, feeRecipient, buyer, seller, unauthorized] = await ethers.getSigners();

    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();
    await usdc.waitForDeployment();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();

    const OrderBook = await ethers.getContractFactory("OrderBook");
    orderBook = await OrderBook.deploy(usdc.getAddress(), agentRegistry.getAddress());
    await orderBook.waitForDeployment();

    const ProtocolFee = await ethers.getContractFactory("ProtocolFee");
    protocolFee = await ProtocolFee.deploy(100, feeRecipient.address); // 1%
    await protocolFee.waitForDeployment();

    const BidEngine = await ethers.getContractFactory("BidEngine");
    bidEngine = await BidEngine.deploy(agentRegistry.getAddress(), orderBook.getAddress());
    await bidEngine.waitForDeployment();

    const DeliveryTracker = await ethers.getContractFactory("DeliveryTracker");
    deliveryTracker = await DeliveryTracker.deploy(orderBook.getAddress(), bidEngine.getAddress());
    await deliveryTracker.waitForDeployment();

    // Wiring
    await orderBook.setBidEngine(await bidEngine.getAddress());
    await orderBook.setDeliveryTracker(await deliveryTracker.getAddress());
    await orderBook.setProtocolFee(await protocolFee.getAddress());
    
    await bidEngine.setDeliveryTracker(await deliveryTracker.getAddress());

    // Setup Agents
    await agentRegistry.connect(buyer).registerAgent("passport_buyer");
    await agentRegistry.connect(seller).registerAgent("passport_seller");
    
    await usdc.mint(buyer.address, ethers.parseEther("1000"));

    // Create Order
    const budget = ethers.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await orderBook.connect(buyer).createOrderGasless(
        buyer.address,
        "Laptop Bag Delivery",
        0, // Goods
        budget,
        deadline,
        "Lagos",
        0,
        ethers.MaxUint256,
        ethers.ZeroHash,
        0,
        ethers.ZeroHash,
        ethers.ZeroHash
    );

    const orders = await orderBook.getOpenOrders(0, 10);
    orderId = orders[0].orderId;

    // Seller places bid
    const price = ethers.parseEther("9"); // 9 USDC
    const eta = Math.floor(Date.now() / 1000) + 43200;
    await bidEngine.connect(seller).placeBid(orderId, price, eta);

    const bids = await bidEngine.getBidsForOrder(orderId);
    
    // Buyer accepts bid
    await bidEngine.connect(buyer).acceptBid(orderId, bids[0].bidId);
  });

  it("seller can post Dispatched milestone", async function () {
    await expect(deliveryTracker.connect(seller).postMilestone(orderId, "Dispatched", "Item picked up from warehouse"))
      .to.emit(deliveryTracker, "MilestonePosted")
      .withArgs(orderId, "Dispatched", (timestamp: number) => true, "Item picked up from warehouse");

    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(2); // InProgress
  });

  it("seller can post InTransit milestone", async function () {
    await deliveryTracker.connect(seller).postMilestone(orderId, "Dispatched", "Item picked up from warehouse");
    await deliveryTracker.connect(seller).postMilestone(orderId, "InTransit", "En route to Lagos");

    const milestones = await deliveryTracker.getMilestones(orderId);
    expect(milestones.length).to.equal(2);
    expect(milestones[1].status).to.equal("InTransit");
  });

  it("seller can post Delivered milestone and status updates", async function () {
    await deliveryTracker.connect(seller).postMilestone(orderId, "Delivered", "Left at front door");

    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(3); // Delivered
  });

  it("getMilestones returns full history in order", async function () {
    await deliveryTracker.connect(seller).postMilestone(orderId, "Dispatched", "Item picked up from warehouse");
    await deliveryTracker.connect(seller).postMilestone(orderId, "InTransit", "En route to Lagos");
    await deliveryTracker.connect(seller).postMilestone(orderId, "Delivered", "Left at front door");

    const milestones = await deliveryTracker.getMilestones(orderId);
    expect(milestones.length).to.equal(3);
    expect(milestones[0].status).to.equal("Dispatched");
    expect(milestones[1].status).to.equal("InTransit");
    expect(milestones[2].status).to.equal("Delivered");
  });

  it("non-seller cannot post milestone (reverts)", async function () {
    await expect(deliveryTracker.connect(unauthorized).postMilestone(orderId, "Dispatched", "Item picked up"))
      .to.be.revertedWith("Only accepted seller can post milestone");
  });

  it("buyer confirmDelivery triggers escrow release", async function () {
    await deliveryTracker.connect(seller).postMilestone(orderId, "Delivered", "Left at front door");

    const sellerInitialBalance = await usdc.balanceOf(seller.address);
    const feeRecipientInitialBalance = await usdc.balanceOf(feeRecipient.address);
    const buyerInitialBalance = await usdc.balanceOf(buyer.address);

    await expect(deliveryTracker.connect(buyer).confirmDelivery(orderId))
      .to.emit(deliveryTracker, "DeliveryConfirmed")
      .withArgs(orderId);

    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(5); // Completed

    const sellerFinalBalance = await usdc.balanceOf(seller.address);
    const feeRecipientFinalBalance = await usdc.balanceOf(feeRecipient.address);
    const buyerFinalBalance = await usdc.balanceOf(buyer.address);

    // Bid was 9 USDC, Fee is 1% (0.09 USDC)
    const bidPrice = ethers.parseEther("9");
    const fee = ethers.parseEther("0.09");
    const sellerPayment = bidPrice - fee;
    const buyerRefund = ethers.parseEther("10") - bidPrice; // 1 USDC refund

    expect(sellerFinalBalance - sellerInitialBalance).to.equal(sellerPayment);
    expect(feeRecipientFinalBalance - feeRecipientInitialBalance).to.equal(fee);
    expect(buyerFinalBalance - buyerInitialBalance).to.equal(buyerRefund);
  });
});

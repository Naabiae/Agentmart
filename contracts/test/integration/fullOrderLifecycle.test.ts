import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry, OrderBook, BidEngine, MockUSDC, ProtocolFee, DeliveryTracker } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Full Order Lifecycle", function () {
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

  beforeEach(async function () {
    [owner, feeRecipient, buyer, seller] = await ethers.getSigners();

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

    // Funding & Registration
    await usdc.mint(buyer.address, ethers.parseEther("1000"));
    await agentRegistry.connect(buyer).registerAgent("passport_buyer");
    await agentRegistry.connect(seller).registerAgent("passport_seller");
  });

  it("buyer registers -> posts order -> seller bids -> buyer accepts -> seller posts milestones -> buyer confirms -> escrow releases correctly", async function () {
    const budget = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    const bidPrice = ethers.parseEther("90"); // Seller bids 90 USDC
    const eta = Math.floor(Date.now() / 1000) + 43200;

    const initialBuyerBalance = await usdc.balanceOf(buyer.address);
    const initialSellerBalance = await usdc.balanceOf(seller.address);
    const initialFeeRecipientBalance = await usdc.balanceOf(feeRecipient.address);

    // 1. Buyer creates Gasless Order
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
    const orderId = orders[0].orderId;

    // 2. Seller Places Bid
    await bidEngine.connect(seller).placeBid(orderId, bidPrice, eta);
    const bids = await bidEngine.getBidsForOrder(orderId);
    const bidId = bids[0].bidId;

    // 3. Buyer Accepts Bid
    await bidEngine.connect(buyer).acceptBid(orderId, bidId);

    // 4. Seller posts milestones
    await deliveryTracker.connect(seller).postMilestone(orderId, "Dispatched", "Item picked up from warehouse");
    await deliveryTracker.connect(seller).postMilestone(orderId, "InTransit", "En route to Lagos");
    await deliveryTracker.connect(seller).postMilestone(orderId, "Delivered", "Left at front door");

    // 5. Buyer confirms delivery
    await deliveryTracker.connect(buyer).confirmDelivery(orderId);

    // 6. Verify Balances & State
    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(5); // Completed

    const feeAmount = ethers.parseEther("0.9"); // 1% of 90 USDC
    const sellerPayment = bidPrice - feeAmount;
    const refundToBuyer = budget - bidPrice; // 10 USDC

    const finalBuyerBalance = await usdc.balanceOf(buyer.address);
    const finalSellerBalance = await usdc.balanceOf(seller.address);
    const finalFeeRecipientBalance = await usdc.balanceOf(feeRecipient.address);

    expect(finalBuyerBalance - initialBuyerBalance + budget).to.equal(refundToBuyer);
    expect(finalSellerBalance - initialSellerBalance).to.equal(sellerPayment);
    expect(finalFeeRecipientBalance - initialFeeRecipientBalance).to.equal(feeAmount);
  });
});

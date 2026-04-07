import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry, OrderBook, MockUSDC, BidEngine } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("BidEngine", function () {
  let agentRegistry: AgentRegistry;
  let orderBook: OrderBook;
  let bidEngine: BidEngine;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let seller1: HardhatEthersSigner;
  let seller2: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;
  let orderId: string;

  beforeEach(async function () {
    [owner, buyer, seller1, seller2, unauthorized] = await ethers.getSigners();

    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();
    await usdc.waitForDeployment();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();

    const OrderBook = await ethers.getContractFactory("OrderBook");
    orderBook = await OrderBook.deploy(usdc.getAddress(), agentRegistry.getAddress());
    await orderBook.waitForDeployment();

    const BidEngine = await ethers.getContractFactory("BidEngine");
    bidEngine = await BidEngine.deploy(agentRegistry.getAddress(), orderBook.getAddress());
    await bidEngine.waitForDeployment();

    await orderBook.setBidEngine(await bidEngine.getAddress());

    await agentRegistry.connect(buyer).registerAgent("passport_buyer");
    await agentRegistry.connect(seller1).registerAgent("passport_seller1");
    await agentRegistry.connect(seller2).registerAgent("passport_seller2");
    
    await usdc.mint(buyer.address, ethers.parseEther("1000"));

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
  });

  it("registered seller can place bid on open order", async function () {
    const price = ethers.parseEther("9");
    const eta = Math.floor(Date.now() / 1000) + 43200;

    await expect(bidEngine.connect(seller1).placeBid(orderId, price, eta))
      .to.emit(bidEngine, "BidPlaced")
      .withArgs(orderId, (bidId: string) => true, seller1.address, price, eta);

    const bids = await bidEngine.getBidsForOrder(orderId);
    expect(bids.length).to.equal(1);
    expect(bids[0].seller).to.equal(seller1.address);
    expect(bids[0].priceWei).to.equal(price);
  });

  it("buyer cannot bid on their own order (reverts)", async function () {
    const price = ethers.parseEther("9");
    const eta = Math.floor(Date.now() / 1000) + 43200;

    await expect(bidEngine.connect(buyer).placeBid(orderId, price, eta))
      .to.be.revertedWith("Buyer cannot bid on own order");
  });

  it("unregistered seller cannot bid (reverts)", async function () {
    const price = ethers.parseEther("9");
    const eta = Math.floor(Date.now() / 1000) + 43200;

    await expect(bidEngine.connect(unauthorized).placeBid(orderId, price, eta))
      .to.be.revertedWith("Agent is not registered or inactive");
  });

  it("multiple bids can exist on same order", async function () {
    const price1 = ethers.parseEther("9");
    const eta1 = Math.floor(Date.now() / 1000) + 43200;
    await bidEngine.connect(seller1).placeBid(orderId, price1, eta1);

    const price2 = ethers.parseEther("8.5");
    const eta2 = Math.floor(Date.now() / 1000) + 50000;
    await bidEngine.connect(seller2).placeBid(orderId, price2, eta2);

    const bids = await bidEngine.getBidsForOrder(orderId);
    expect(bids.length).to.equal(2);
  });

  it("buyer can accept a bid, transitions order to Matched, other bids Rejected", async function () {
    await bidEngine.connect(seller1).placeBid(orderId, ethers.parseEther("9"), Math.floor(Date.now() / 1000) + 43200);
    await bidEngine.connect(seller2).placeBid(orderId, ethers.parseEther("8.5"), Math.floor(Date.now() / 1000) + 50000);

    const bids = await bidEngine.getBidsForOrder(orderId);
    const bidIdToAccept = bids[0].bidId;
    const bidIdToReject = bids[1].bidId;

    await expect(bidEngine.connect(buyer).acceptBid(orderId, bidIdToAccept))
      .to.emit(bidEngine, "BidAccepted")
      .withArgs(orderId, bidIdToAccept);

    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(1); // Matched
    expect(order.acceptedBidId).to.equal(bidIdToAccept);

    const acceptedBid = await bidEngine.getBid(bidIdToAccept);
    expect(acceptedBid.status).to.equal(1); // Accepted

    const rejectedBid = await bidEngine.getBid(bidIdToReject);
    expect(rejectedBid.status).to.equal(2); // Rejected
  });

  it("non-buyer cannot accept bid (reverts)", async function () {
    await bidEngine.connect(seller1).placeBid(orderId, ethers.parseEther("9"), Math.floor(Date.now() / 1000) + 43200);
    const bids = await bidEngine.getBidsForOrder(orderId);

    await expect(bidEngine.connect(seller2).acceptBid(orderId, bids[0].bidId))
      .to.be.revertedWith("Only buyer can accept bid");
  });
});

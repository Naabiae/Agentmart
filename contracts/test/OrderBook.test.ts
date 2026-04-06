import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry, OrderBook, MockUSDC } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("OrderBook", function () {
  let agentRegistry: AgentRegistry;
  let orderBook: OrderBook;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let buyer: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, buyer, unauthorized] = await ethers.getSigners();

    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy();
    await usdc.waitForDeployment();

    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();

    const OrderBook = await ethers.getContractFactory("OrderBook");
    orderBook = await OrderBook.deploy(usdc.getAddress(), agentRegistry.getAddress());
    await orderBook.waitForDeployment();

    await agentRegistry.connect(buyer).registerAgent("passport_buyer");
    await usdc.mint(buyer.address, ethers.parseEther("1000"));
  });

  it("creates order with correct fields and emits OrderCreated", async function () {
    const budget = ethers.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await expect(
      orderBook.connect(buyer).createOrderGasless(
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
      )
    ).to.emit(orderBook, "OrderCreated");

    // Check USDC balance of OrderBook
    expect(await usdc.balanceOf(await orderBook.getAddress())).to.equal(budget);

    // Get order and check fields
    const orders = await orderBook.getOpenOrders(0, 10);
    expect(orders.length).to.equal(1);
    expect(orders[0].buyer).to.equal(buyer.address);
    expect(orders[0].budgetWei).to.equal(budget);
  });

  it("buyer can cancel an Open order", async function () {
    const budget = ethers.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await orderBook.connect(buyer).createOrderGasless(
      buyer.address,
      "Laptop Bag Delivery",
      0,
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

    const initialBuyerBalance = await usdc.balanceOf(buyer.address);

    const orders = await orderBook.getOpenOrders(0, 10);
    const orderId = orders[0].orderId;

    await expect(orderBook.connect(buyer).cancelOrder(orderId))
      .to.emit(orderBook, "OrderCancelled")
      .withArgs(orderId);

    const order = await orderBook.getOrder(orderId);
    expect(order.status).to.equal(6); // Cancelled

    // Check refund
    const finalBuyerBalance = await usdc.balanceOf(buyer.address);
    expect(finalBuyerBalance - initialBuyerBalance).to.equal(budget);
  });

  it("non-buyer cannot cancel order (reverts)", async function () {
    const budget = ethers.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await orderBook.connect(buyer).createOrderGasless(
      buyer.address,
      "Laptop Bag Delivery",
      0,
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

    await expect(orderBook.connect(unauthorized).cancelOrder(orderId))
      .to.be.revertedWith("Only buyer can cancel");
  });

  it("unregistered address cannot create order (reverts)", async function () {
    await expect(
      orderBook.connect(unauthorized).createOrderGasless(
        unauthorized.address,
        "Laptop Bag Delivery",
        0,
        ethers.parseEther("10"),
        Math.floor(Date.now() / 1000) + 86400,
        "Lagos",
        0,
        ethers.MaxUint256,
        ethers.ZeroHash,
        0,
        ethers.ZeroHash,
        ethers.ZeroHash
      )
    ).to.be.revertedWith("Agent is not registered or inactive");
  });

  it("getOpenOrders respects pagination (offset, limit)", async function () {
    const budget = ethers.parseEther("10");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    for(let i = 0; i < 5; i++) {
        await orderBook.connect(buyer).createOrderGasless(
            buyer.address,
            `Laptop Bag Delivery ${i}`,
            0,
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
    }

    const firstPage = await orderBook.getOpenOrders(0, 3);
    expect(firstPage.length).to.equal(3);
    
    const secondPage = await orderBook.getOpenOrders(3, 3);
    expect(secondPage.length).to.equal(2);
  });
});

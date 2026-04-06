import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentRegistry", function () {
  let agentRegistry: AgentRegistry;
  let owner: HardhatEthersSigner;
  let agent1: HardhatEthersSigner;
  let agent2: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, agent1, agent2] = await ethers.getSigners();
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy();
    await agentRegistry.waitForDeployment();
  });

  it("registers a new agent with correct defaults", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    
    const profile = await agentRegistry.getAgent(agent1.address);
    expect(profile.agentAddress).to.equal(agent1.address);
    expect(profile.passportId).to.equal("passport_123");
    expect(profile.totalOrders).to.equal(0);
    expect(profile.totalDisputes).to.equal(0);
    expect(profile.reputationScore).to.equal(50);
    expect(profile.isActive).to.be.true;
  });

  it("stores passportId correctly", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_456");
    const profile = await agentRegistry.getAgent(agent1.address);
    expect(profile.passportId).to.equal("passport_456");
  });

  it("reverts when registering an already-registered agent", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    await expect(
      agentRegistry.connect(agent1).registerAgent("passport_456")
    ).to.be.revertedWith("Agent already registered");
  });

  it("getAgent returns correct profile", async function () {
    await agentRegistry.connect(agent2).registerAgent("passport_789");
    const profile = await agentRegistry.getAgent(agent2.address);
    expect(profile.passportId).to.equal("passport_789");
  });

  it("isRegistered returns true after registration (via a dummy modifier check if we had one)", async function () {
    // We can't directly call the modifier, but we can verify the state
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    const profile = await agentRegistry.getAgent(agent1.address);
    expect(profile.isActive).to.be.true;
  });

  it("owner can deactivate agent", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    await agentRegistry.connect(owner).deactivateAgent(agent1.address);
    const profile = await agentRegistry.getAgent(agent1.address);
    expect(profile.isActive).to.be.false;
  });

  it("non-owner cannot deactivate agent (reverts)", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    await expect(
      agentRegistry.connect(agent2).deactivateAgent(agent1.address)
    ).to.be.revertedWithCustomError(agentRegistry, "OwnableUnauthorizedAccount");
  });

  it("deactivated agent shows isActive = false", async function () {
    await agentRegistry.connect(agent1).registerAgent("passport_123");
    await agentRegistry.connect(owner).deactivateAgent(agent1.address);
    const profile = await agentRegistry.getAgent(agent1.address);
    expect(profile.isActive).to.be.false;
  });
});

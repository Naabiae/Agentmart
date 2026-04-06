import { expect } from "chai";
import { ethers } from "hardhat";
import { ProtocolFee } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ProtocolFee", function () {
  let protocolFee: ProtocolFee;
  let owner: HardhatEthersSigner;
  let feeRecipient: HardhatEthersSigner;
  let newFeeRecipient: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, feeRecipient, newFeeRecipient] = await ethers.getSigners();

    const ProtocolFee = await ethers.getContractFactory("ProtocolFee");
    protocolFee = await ProtocolFee.deploy(100, feeRecipient.address); // 1%
    await protocolFee.waitForDeployment();
  });

  it("initializes with correct fee and recipient", async function () {
    expect(await protocolFee.feePercent()).to.equal(100);
    expect(await protocolFee.feeRecipient()).to.equal(feeRecipient.address);
  });

  it("calculates 1% fee correctly", async function () {
    const amount = ethers.parseEther("100");
    const fee = await protocolFee.calculateFee(amount);
    expect(fee).to.equal(ethers.parseEther("1")); // 1% of 100 is 1
  });

  it("owner can update fee percent", async function () {
    await expect(protocolFee.connect(owner).updateFeePercent(200)) // 2%
      .to.emit(protocolFee, "FeePercentUpdated")
      .withArgs(200);

    expect(await protocolFee.feePercent()).to.equal(200);
    
    const amount = ethers.parseEther("100");
    const fee = await protocolFee.calculateFee(amount);
    expect(fee).to.equal(ethers.parseEther("2"));
  });

  it("owner can update fee recipient", async function () {
    await expect(protocolFee.connect(owner).updateFeeRecipient(newFeeRecipient.address))
      .to.emit(protocolFee, "FeeRecipientUpdated")
      .withArgs(newFeeRecipient.address);

    expect(await protocolFee.feeRecipient()).to.equal(newFeeRecipient.address);
  });

  it("reverts on invalid fee update (>100%)", async function () {
    await expect(protocolFee.connect(owner).updateFeePercent(10001))
      .to.be.revertedWith("Fee percent cannot exceed 100%");
  });
});

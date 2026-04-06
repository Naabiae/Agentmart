import { expect } from "chai";
import { ethers } from "hardhat";

describe("Counter", function () {
  it("deploys with initial count of 0", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    expect(await counter.count()).to.equal(0);
  });

  it("increments count by 1", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    await counter.increment();
    expect(await counter.count()).to.equal(1);
  });

  it("only increments, never decrements", async function () {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    await counter.waitForDeployment();

    await counter.increment();
    await counter.increment();
    expect(await counter.count()).to.equal(2);
  });
});

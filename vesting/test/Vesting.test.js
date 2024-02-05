const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require('@nomicfoundation/hardhat-network-helpers');
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const currentTime = async () => {
  const { timestamp } = await ethers.provider.getBlock("latest");
  return timestamp;
};

describe("Vesting", () => {
  async function deployVestingFixture() {
    const signer = await ethers.provider.getSigner(0);

    const ooneToken = await ethers.deployContract("OONE", [signer.address]);
    await ooneToken.waitForDeployment();

    const vesting = await ethers.deployContract("Vesting", [signer.address, ooneToken.target]);
    const vestingDeploymentTime = await currentTime();

    await ooneToken.transferOwnership(vesting.target);

    const DURATION = 30 * 24 * 60 * 60;
    const MAX_MINTABLE_AMOUNT = 7_500_000n * 10n ** 18n

    return {ooneToken, vesting, vestingDeploymentTime, signer, DURATION, MAX_MINTABLE_AMOUNT};
  }

  describe("Deployment", async () => {
    it("DURATION is correct", async () => {
      const { vesting, DURATION } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.DURATION(), DURATION);
    });

    it("MAX_MINTABLE_AMOUNT is correct", async () => {
      const { vesting, MAX_MINTABLE_AMOUNT } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.MAX_MINTABLE_AMOUNT(), MAX_MINTABLE_AMOUNT);
    });

    it("owner is correct", async () => {
      const { vesting, signer } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.owner(), signer.address);
    });

    it("lastUpdated is correct", async () => {
      const { vesting, vestingDeploymentTime } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.lastUpdated(), vestingDeploymentTime);
    });

    it("mintableAmount is correct", async () => {
      const { vesting, MAX_MINTABLE_AMOUNT } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.mintableAmount(), MAX_MINTABLE_AMOUNT);
    });

    it("isStopped is correct", async () => {
      const { vesting } = await loadFixture(deployVestingFixture);
      assert.equal(await vesting.isStopped(), false);
    });
  });

  describe("mint", async () => {
    it("mint should revert if called by not owner", async () => {
      const { ooneToken } = await loadFixture(deployVestingFixture);
      const vesting = await ethers.deployContract("Vesting", ['0x32f48385d84108fC2B6383C2db37a573bEC071FA', ooneToken.target]);
      await expect(vesting.mint(1)).to.be.revertedWith('Only owner is allowed to call this function');
    });

    it("mint should work if called by owner", async () => {
      const { vesting, ooneToken, signer, vestingDeploymentTime, MAX_MINTABLE_AMOUNT } = await loadFixture(deployVestingFixture);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), vestingDeploymentTime);
      assert.equal(await ooneToken.balanceOf(signer.address), 1);
      assert.equal(await vesting.mintableAmount(), MAX_MINTABLE_AMOUNT - 1n);
    });

    it("mint should revert if limit is reached", async () => {
      const { vesting, MAX_MINTABLE_AMOUNT } = await loadFixture(deployVestingFixture);
      await expect(await vesting.mint(MAX_MINTABLE_AMOUNT))
        .to.emit(vesting, "TokensMinted")
        .withArgs(MAX_MINTABLE_AMOUNT);
      assert.equal(await vesting.mintableAmount(), 0);
      await expect(vesting.mint(1)).to.be.revertedWith('Limit on minting is reached for this duration');
    });

    it("mint should work if limit is reached and month passed", async () => {
      const { vesting, ooneToken, signer, vestingDeploymentTime, MAX_MINTABLE_AMOUNT, DURATION } = await loadFixture(deployVestingFixture);
      await expect(await vesting.mint(MAX_MINTABLE_AMOUNT))
        .to.emit(vesting, "TokensMinted")
        .withArgs(MAX_MINTABLE_AMOUNT);
      assert.equal(await vesting.lastUpdated(), vestingDeploymentTime);
      assert.equal(await ooneToken.balanceOf(signer.address), MAX_MINTABLE_AMOUNT);
      assert.equal(await vesting.mintableAmount(), 0);
      
      await time.increase(DURATION);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), await currentTime());
      assert.equal(await ooneToken.balanceOf(signer.address), MAX_MINTABLE_AMOUNT + 1n);
      assert.equal(await vesting.mintableAmount(), MAX_MINTABLE_AMOUNT - 1n);
    });

    it("limit should be passed on to the next month", async () => {
      const { vesting, ooneToken, signer, vestingDeploymentTime, MAX_MINTABLE_AMOUNT, DURATION } = await loadFixture(deployVestingFixture);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), vestingDeploymentTime);
      assert.equal(await ooneToken.balanceOf(signer.address), 1);
      assert.equal(await vesting.mintableAmount(), MAX_MINTABLE_AMOUNT - 1n);
      
      await time.increase(DURATION);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), await currentTime());
      assert.equal(await ooneToken.balanceOf(signer.address), 2);
      assert.equal(await vesting.mintableAmount(), 2n * MAX_MINTABLE_AMOUNT - 2n);
    });

    it("sum of limits should be passed on after 2 months", async () => {
      const { vesting, ooneToken, signer, vestingDeploymentTime, MAX_MINTABLE_AMOUNT, DURATION } = await loadFixture(deployVestingFixture);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), vestingDeploymentTime);
      assert.equal(await ooneToken.balanceOf(signer.address), 1);
      assert.equal(await vesting.mintableAmount(), MAX_MINTABLE_AMOUNT - 1n);
      
      await time.increase(2 * DURATION);
      await expect(await vesting.mint(1))
        .to.emit(vesting, "TokensMinted")
        .withArgs(1);
      assert.equal(await vesting.lastUpdated(), await currentTime());
      assert.equal(await ooneToken.balanceOf(signer.address), 2);
      assert.equal(await vesting.mintableAmount(), 3n * MAX_MINTABLE_AMOUNT - 2n);
    });
  });

  describe("stop", async () => {
    it("stop should revert if called by not owner", async () => {
      const { ooneToken } = await loadFixture(deployVestingFixture);
      const vesting = await ethers.deployContract("Vesting", ['0x32f48385d84108fC2B6383C2db37a573bEC071FA', ooneToken.target]);
      await expect(vesting.stop()).to.be.revertedWith('Only owner is allowed to call this function');
    });

    it("stop should work if called by owner", async () => {
      const { vesting } = await loadFixture(deployVestingFixture);
      await expect(await vesting.stop())
        .to.emit(vesting, "VestingStopped");
      assert.equal(await vesting.isStopped(), true);
      await expect(vesting.mint(1)).to.be.revertedWith('Vesting is stopped');
    });
  });
});

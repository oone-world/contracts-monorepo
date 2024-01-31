const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("RewardsDistributor", () => {
  async function deployRewardsDistributorFixture() {
    const ooneToken = await ethers.deployContract("OONE");
    await ooneToken.waitForDeployment();

    const signer = await ethers.provider.getSigner(0);

    const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
    const rewardsDistributor = await upgrades.deployProxy(RewardsDistributor, [ooneToken.target, signer.address], {
        initializer: "initialize",
    });

    const testAddress = '1234567-0123';
    const testAddress2 = '0x24c65459AC8562Ff738974eE2c92A32683d17fdB';

    return {ooneToken, rewardsDistributor, signer, testAddress, testAddress2};
  }

  describe("Deployment", async () => {
    it("rewards token is correct", async () => {
      const { rewardsDistributor, ooneToken } = await loadFixture(deployRewardsDistributorFixture);
      assert.equal(await rewardsDistributor.rewardsToken(), ooneToken.target);
    });

    it("deployer has admin role", async () => {
      const { rewardsDistributor, signer } = await loadFixture(deployRewardsDistributorFixture);
      assert.equal(await rewardsDistributor.hasRole(await rewardsDistributor.DEFAULT_ADMIN_ROLE(), signer.address), true);
    });
  });

  describe("setRewardsToken", async () => {
    it("setRewardsToken should revert if called by not admin", async () => {
      const { rewardsDistributor, signer, testAddress2 } = await loadFixture(deployRewardsDistributorFixture);
      await rewardsDistributor.revokeRole(await rewardsDistributor.DEFAULT_ADMIN_ROLE(), signer.address);
      await expect(rewardsDistributor.setRewardsToken(testAddress2)).to.be.reverted;
    });

    it("setRewardsToken should work if called by admin", async () => {
      const { rewardsDistributor, ooneToken, testAddress2 } = await loadFixture(deployRewardsDistributorFixture);
      await expect(await rewardsDistributor.setRewardsToken(testAddress2))
        .to.emit(rewardsDistributor, "RewardsTokenChanged")
        .withArgs(ooneToken.target, testAddress2);
      assert.equal(await rewardsDistributor.rewardsToken(), testAddress2);
    });
  });

  describe("refillBalance", async () => {
    it("refillBalance should revert if called by not authorized address", async () => {
      const { rewardsDistributor, testAddress } = await loadFixture(deployRewardsDistributorFixture);
      await expect(rewardsDistributor.refillBalance(testAddress, 1)).to.be.reverted;
    });

    it("refillBalance should revert if rewards token is 0", async () => {
      const { rewardsDistributor, signer, testAddress} = await loadFixture(deployRewardsDistributorFixture);
      await rewardsDistributor.grantRole(await rewardsDistributor.VAULT_ROLE(), signer.address);
      await rewardsDistributor.setRewardsToken('0x0000000000000000000000000000000000000000');

      await expect(rewardsDistributor.refillBalance(testAddress, 1)).to.be.revertedWith('Refilling is paused');
    });

    it("refillBalance should work if called by authorized address", async () => {
      const { rewardsDistributor, ooneToken, signer, testAddress } = await loadFixture(deployRewardsDistributorFixture);
      const amount = 1;
      
      await rewardsDistributor.grantRole(await rewardsDistributor.VAULT_ROLE(), signer.address);
      await ooneToken.approve(rewardsDistributor.target, amount);
      
      const balanceContractBefore = await ooneToken.balanceOf(rewardsDistributor.target);
      const balanceVaultBefore = await ooneToken.balanceOf(signer.address);
      const balanceUserBefore = await rewardsDistributor.userBalance(testAddress);
      
      assert.equal(balanceUserBefore, 0);
      await expect(rewardsDistributor.refillBalance(testAddress, amount))
        .to.emit(rewardsDistributor, "RewardsRefilled")
        .withArgs(signer.address, testAddress, ooneToken.target, amount);
      
      const balanceContractAfter = await ooneToken.balanceOf(rewardsDistributor.target);
      const balanceVaultAfter = await ooneToken.balanceOf(signer.address);
      const balanceUserAfter = await rewardsDistributor.userBalance(testAddress);

      assert.equal(balanceContractAfter - balanceContractBefore, amount);
      assert.equal(balanceUserAfter - balanceUserBefore, amount);
      assert.equal(balanceVaultAfter - balanceVaultBefore, -amount);
    });
  });

  describe("sendRewards", async () => {
    it("sendRewards should revert if called by not authorized address", async () => {
      const { rewardsDistributor, testAddress, testAddress2 } = await loadFixture(deployRewardsDistributorFixture);
      await expect(rewardsDistributor.sendRewards(testAddress, 1, testAddress2)).to.be.reverted;
    });

    it("sendRewards should revert if rewards token is 0", async () => {
      const { rewardsDistributor, signer, testAddress, testAddress2} = await loadFixture(deployRewardsDistributorFixture);
      await rewardsDistributor.grantRole(await rewardsDistributor.SEND_REWARDS_ROLE(), signer.address);
      await rewardsDistributor.setRewardsToken('0x0000000000000000000000000000000000000000');

      await expect(rewardsDistributor.sendRewards(testAddress, 1, testAddress2)).to.be.revertedWith('Sending rewards is paused');
    });

    it("sendRewards should work if called by authorized address", async () => {
      const { rewardsDistributor, ooneToken, signer, testAddress, testAddress2 } = await loadFixture(deployRewardsDistributorFixture);
      const amount = 6;
      
      await rewardsDistributor.grantRole(await rewardsDistributor.VAULT_ROLE(), signer.address);
      await rewardsDistributor.grantRole(await rewardsDistributor.SEND_REWARDS_ROLE(), signer.address);
      await ooneToken.approve(rewardsDistributor.target, amount);
      await rewardsDistributor.refillBalance(testAddress, amount);
      
      const balanceContractBefore = await ooneToken.balanceOf(rewardsDistributor.target);
      const balanceUserBefore = await rewardsDistributor.userBalance(testAddress);
      const balanceRecipientBefore = await ooneToken.balanceOf(testAddress2);
      
      await expect(rewardsDistributor.sendRewards(testAddress, amount, testAddress2))
        .to.emit(rewardsDistributor, "RewardsSent")
        .withArgs(testAddress, ooneToken.target, amount, testAddress2);
      
      const balanceContractAfter = await ooneToken.balanceOf(rewardsDistributor.target);
      const balanceUserAfter = await rewardsDistributor.userBalance(testAddress);
      const balanceRecipientAfter = await ooneToken.balanceOf(testAddress2);

      assert.equal(balanceContractAfter - balanceContractBefore, -amount);
      assert.equal(balanceUserAfter - balanceUserBefore, -amount);
      assert.equal(balanceRecipientAfter - balanceRecipientBefore, amount);
    });

    it("sendRewards should revert if not enough user balance", async () => {
      const { rewardsDistributor, ooneToken, signer, testAddress, testAddress2 } = await loadFixture(deployRewardsDistributorFixture);
      const amount = 6;
      
      await rewardsDistributor.grantRole(await rewardsDistributor.VAULT_ROLE(), signer.address);
      await rewardsDistributor.grantRole(await rewardsDistributor.SEND_REWARDS_ROLE(), signer.address);
      await ooneToken.approve(rewardsDistributor.target, amount);
      await rewardsDistributor.refillBalance(testAddress, amount);
      
      await expect(rewardsDistributor.sendRewards(testAddress, amount + 1, testAddress2)).to.be.revertedWith('Not enough user balance');
    });
  });
});

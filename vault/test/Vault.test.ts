const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Vault", () => {
  async function deployVaultFixture() {
    const ooneToken = await ethers.deployContract("OONE");
    await ooneToken.waitForDeployment();

    const usdtToken = await ethers.deployContract("OONE");
    await usdtToken.waitForDeployment();

    const signer = await ethers.provider.getSigner(0);
    
    const rewardsDistributorOone = await ethers.deployContract("RewardsDistributorMock", [ooneToken.target]);
    await rewardsDistributorOone.waitForDeployment();
    const contractToRefill3 = rewardsDistributorOone.target;
    
    const rewardsDistributorUsdt = await ethers.deployContract("RewardsDistributorMock", [usdtToken.target]);
    await rewardsDistributorUsdt.waitForDeployment();
    const contractToRefill4 = rewardsDistributorUsdt.target;
    const testAddress = '0x32f48385d84108fC2B6383C2db37a573bEC071FA';
    const testUserId = '12345-67890';

    const minWorkingBalance = 10n ** 18n;
    const refillAmount = 5n * 10n ** 18n;

    const Vault = await ethers.getContractFactory("Vault");
    const vault = await upgrades.deployProxy(Vault, [ooneToken.target, usdtToken.target, contractToRefill3, contractToRefill4, minWorkingBalance, refillAmount, signer.address], {
        initializer: "initialize",
    });

    await ooneToken.transfer(vault.target, 10n ** 18n);
    await usdtToken.transfer(vault.target, 10n ** 18n);
    await signer.sendTransaction({
      to: vault.target,
      value: refillAmount,
    });

    return {ooneToken, usdtToken, vault, signer, contractToRefill3, contractToRefill4, minWorkingBalance, refillAmount, testAddress, testUserId};
  }

  describe("Deployment", async () => {
    it("ooneToken is correct", async () => {
      const { vault, ooneToken } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.ooneToken(), ooneToken.target);
    });

    it("usdtToken is correct", async () => {
      const { vault, usdtToken } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.usdtToken(), usdtToken.target);
    });

    it("rewardsDistributorOone is correct", async () => {
      const { vault, contractToRefill3 } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.rewardsDistributorOone(), contractToRefill3);
    });

    it("rewardsDistributorUsdt is correct", async () => {
      const { vault, contractToRefill4 } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.rewardsDistributorUsdt(), contractToRefill4);
    });

    it("minWorkingBalance is correct", async () => {
      const { vault, minWorkingBalance } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.minWorkingBalance(), minWorkingBalance);
    });

    it("refillAmount is correct", async () => {
      const { vault, refillAmount } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.refillAmount(), refillAmount);
    });

    it("deployer has admin role", async () => {
      const { vault, signer } = await loadFixture(deployVaultFixture);
      assert.equal(await vault.hasRole(await vault.DEFAULT_ADMIN_ROLE(), signer.address), true);
    });
  });

  describe("setRewardsDistributorOone", async () => {
    it("setRewardsDistributorOone should revert if called by not admin", async () => {
      const { vault, signer, testAddress } = await loadFixture(deployVaultFixture);
      await vault.revokeRole(await vault.DEFAULT_ADMIN_ROLE(), signer.address);
      await expect(vault.setRewardsDistributorOone(testAddress)).to.be.reverted;
    });

    it("setRewardsDistributorOone should work if called by admin", async () => {
      const { vault, contractToRefill3, testAddress } = await loadFixture(deployVaultFixture);
      await expect(await vault.setRewardsDistributorOone(testAddress))
        .to.emit(vault, "RewardsDistributorOoneChanged")
        .withArgs(contractToRefill3, testAddress);
      assert.equal(await vault.rewardsDistributorOone(), testAddress);
    });
  });

  describe("setRewardsDistributorUsdt", async () => {
    it("setRewardsDistributorUsdt should revert if called by not admin", async () => {
      const { vault, signer, testAddress } = await loadFixture(deployVaultFixture);
      await vault.revokeRole(await vault.DEFAULT_ADMIN_ROLE(), signer.address);
      await expect(vault.setRewardsDistributorUsdt(testAddress)).to.be.reverted;
    });

    it("setRewardsDistributorUsdt should work if called by admin", async () => {
      const { vault, contractToRefill4, testAddress } = await loadFixture(deployVaultFixture);
      await expect(await vault.setRewardsDistributorUsdt(testAddress))
        .to.emit(vault, "RewardsDistributorUsdtChanged")
        .withArgs(contractToRefill4, testAddress);
      assert.equal(await vault.rewardsDistributorUsdt(), testAddress);
    });
  });

  describe("setMinWorkingBalance", async () => {
    it("setMinWorkingBalance should revert if called by not admin", async () => {
      const { vault, signer } = await loadFixture(deployVaultFixture);
      await vault.revokeRole(await vault.DEFAULT_ADMIN_ROLE(), signer.address);
      await expect(vault.setMinWorkingBalance(1)).to.be.reverted;
    });

    it("setMinWorkingBalance should work if called by admin", async () => {
      const { vault, minWorkingBalance } = await loadFixture(deployVaultFixture);
      await expect(await vault.setMinWorkingBalance(1))
        .to.emit(vault, "MinWorkingBalanceChanged")
        .withArgs(minWorkingBalance, 1);
      assert.equal(await vault.minWorkingBalance(), 1);
    });
  });

  describe("setRefillAmount", async () => {
    it("setRefillAmount should revert if called by not admin", async () => {
      const { vault, signer } = await loadFixture(deployVaultFixture);
      await vault.revokeRole(await vault.DEFAULT_ADMIN_ROLE(), signer.address);
      await expect(vault.setRefillAmount(1)).to.be.reverted;
    });

    it("setRefillAmount should work if called by admin", async () => {
      const { vault, refillAmount } = await loadFixture(deployVaultFixture);
      await expect(await vault.setRefillAmount(1))
        .to.emit(vault, "RefillAmountChanged")
        .withArgs(refillAmount, 1);
      assert.equal(await vault.refillAmount(), 1);
    });
  });

  describe("refillRewardsDistributorOone", async () => {
    it("refillRewardsDistributorOone should revert if called by not refill balance role", async () => {
      const { vault, testUserId } = await loadFixture(deployVaultFixture);
      await expect(vault.refillRewardsDistributorOone(testUserId, 1)).to.be.reverted;
    });

    it("refillRewardsDistributorOone should work if called by refill balance role", async () => {
      const { vault, ooneToken, contractToRefill3, signer, testUserId } = await loadFixture(deployVaultFixture);
      await vault.grantRole(await vault.REFILL_BALANCE_ROLE(), signer.address);
      
      const vaultBalanceBefore = await ooneToken.balanceOf(vault.target);
      const rewardsDistributorOoneBalanceBefore = await ooneToken.balanceOf(contractToRefill3);
      
      await expect(await vault.refillRewardsDistributorOone(testUserId, 1))
        .to.emit(vault, "RewardsDistributorOoneRefilled")
        .withArgs(contractToRefill3, testUserId, 1);

      const vaultBalanceAfter = await ooneToken.balanceOf(vault.target);
      const rewardsDistributorOoneBalanceAfter = await ooneToken.balanceOf(contractToRefill3);
      
      assert.equal(vaultBalanceAfter - vaultBalanceBefore, -1);
      assert.equal(rewardsDistributorOoneBalanceAfter - rewardsDistributorOoneBalanceBefore, 1);
    });
  });

  describe("refillRewardsDistributorUsdt", async () => {
    it("refillRewardsDistributorUsdt should revert if called by not refill balance role", async () => {
      const { vault, testUserId } = await loadFixture(deployVaultFixture);
      await expect(vault.refillRewardsDistributorUsdt(testUserId, 1)).to.be.reverted;
    });

    it("refillRewardsDistributorUsdt should work if called by refill balance role", async () => {
      const { vault, usdtToken, contractToRefill4, signer, testUserId } = await loadFixture(deployVaultFixture);
      await vault.grantRole(await vault.REFILL_BALANCE_ROLE(), signer.address);
      
      const vaultBalanceBefore = await usdtToken.balanceOf(vault.target);
      const rewardsDistributorUsdtBalanceBefore = await usdtToken.balanceOf(contractToRefill4);
      
      await expect(await vault.refillRewardsDistributorUsdt(testUserId, 1))
        .to.emit(vault, "RewardsDistributorUsdtRefilled")
        .withArgs(contractToRefill4, testUserId, 1);

      const vaultBalanceAfter = await usdtToken.balanceOf(vault.target);
      const rewardsDistributorUsdtBalanceAfter = await usdtToken.balanceOf(contractToRefill4);
      
      assert.equal(vaultBalanceAfter - vaultBalanceBefore, -1);
      assert.equal(rewardsDistributorUsdtBalanceAfter - rewardsDistributorUsdtBalanceBefore, 1);
    });
  });

  describe("refillBalances", async () => {
    it("refillBalances should revert if called by not refill balance role", async () => {
      const { vault, testAddress } = await loadFixture(deployVaultFixture);
      await expect(vault.refillBalances([testAddress])).to.be.reverted;
    });

    it("refillBalances should work if called by refill balance role", async () => {
      const { vault, signer, refillAmount, testAddress } = await loadFixture(deployVaultFixture);
      await vault.grantRole(await vault.REFILL_BALANCE_ROLE(), signer.address);
      
      const vaultBalanceBefore = await ethers.provider.getBalance(vault.target);
      const testAddressBalanceBefore = await ethers.provider.getBalance(testAddress);
      
      await expect(await vault.refillBalances([testAddress]))
        .to.emit(vault, "BalanceRefilled")
        .withArgs(testAddress, refillAmount);

      const vaultBalanceAfter = await ethers.provider.getBalance(vault.target);
      const testAddressBalanceAfter = await ethers.provider.getBalance(testAddress);
      
      assert.equal(vaultBalanceAfter - vaultBalanceBefore, -refillAmount);
      assert.equal(testAddressBalanceAfter - testAddressBalanceBefore, refillAmount);
    });

    it("refillBalances should not refill balance if its >= minWorkingBalance", async () => {
      const { vault, signer, minWorkingBalance, testAddress } = await loadFixture(deployVaultFixture);
      await vault.grantRole(await vault.REFILL_BALANCE_ROLE(), signer.address);
      await signer.sendTransaction({
        to: testAddress,
        value: minWorkingBalance,
      });
      
      const vaultBalanceBefore = await ethers.provider.getBalance(vault.target);
      const testAddressBalanceBefore = await ethers.provider.getBalance(testAddress);
      
      await expect(await vault.refillBalances([testAddress]))
        .to.not.emit(vault, "BalanceRefilled");

      const vaultBalanceAfter = await ethers.provider.getBalance(vault.target);
      const testAddressBalanceAfter = await ethers.provider.getBalance(testAddress);
      
      assert.equal(vaultBalanceAfter - vaultBalanceBefore, 0);
      assert.equal(testAddressBalanceAfter - testAddressBalanceBefore, 0);
    });
  });

  describe("native", async () => {
    it("should emit event in receive", async () => {
      const { vault, signer } = await loadFixture(deployVaultFixture);
      await expect(signer.sendTransaction({
        to: vault.target,
        value: 1,
      }))
        .to.emit(vault, "NativeReceived")
        .withArgs(signer.address, 1);
    });

    it("should emit event in fallback", async () => {
      const { vault, signer } = await loadFixture(deployVaultFixture);
      await expect(signer.sendTransaction({
        to: vault.target,
        data: '0x11111111',
        value: 1,
      }))
        .to.emit(vault, "NativeReceived")
        .withArgs(signer.address, 1);
    });
  });
});

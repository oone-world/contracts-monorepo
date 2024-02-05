const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("OoneToken", () => {
  async function deployOoneTokenFixture() {
    const signer = await ethers.provider.getSigner(0);

    const ooneToken = await ethers.deployContract("OoneToken", [signer.address]);
    await ooneToken.waitForDeployment();

    return {ooneToken, signer};
  }

  describe("Deployment", async () => {
    it("total supply is 0", async () => {
      const { ooneToken } = await loadFixture(deployOoneTokenFixture);
      assert.equal(await ooneToken.totalSupply(), 0);
    });
  });

  describe("mint", async () => {
    it("mint should revert if called by not owner", async () => {
      const ooneToken = await ethers.deployContract("OoneToken", ['0x32f48385d84108fC2B6383C2db37a573bEC071FA']);
      await expect(ooneToken.mint('0x32f48385d84108fC2B6383C2db37a573bEC071FA', 1)).to.be.revertedWithCustomError(ooneToken, 'OwnableUnauthorizedAccount');
    });

    it("mint should work if called by owner", async () => {
      const { ooneToken, signer } = await loadFixture(deployOoneTokenFixture);
      await ooneToken.mint(signer.address, 1);
      assert.equal(await ooneToken.totalSupply(), 1);
      assert.equal(await ooneToken.balanceOf(signer.address), 1);
    });
  });
});

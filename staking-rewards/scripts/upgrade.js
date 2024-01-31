require('dotenv').config();
const { MUMBAI_STAKING_REWARDS } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Upgrading contracts with the account:", deployer.address);

  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const stakingRewards = await upgrades.upgradeProxy(MUMBAI_STAKING_REWARDS, StakingRewards);

  console.log("StakingRewards address:", await stakingRewards.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

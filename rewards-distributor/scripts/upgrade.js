require('dotenv').config();
const { MUMBAI_REWARDS_DISTRIBUTOR_USDT } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Upgrading contracts with the account:", deployer.address);

  const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
  const rewardsDistributor = await upgrades.upgradeProxy(MUMBAI_REWARDS_DISTRIBUTOR_USDT, RewardsDistributor);

  console.log("RewardsDistributor address:", await rewardsDistributor.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

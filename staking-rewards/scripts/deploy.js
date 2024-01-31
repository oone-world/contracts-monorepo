require('dotenv').config();
const { MUMBAI_OONE_TOKEN } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Deploying contracts with the account:", deployer.address);

  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const stakingRewards = await upgrades.deployProxy(StakingRewards, [deployer.address, MUMBAI_OONE_TOKEN, MUMBAI_OONE_TOKEN], {
      initializer: "initialize",
  });

  console.log("StakingRewards address:", await stakingRewards.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

require('dotenv').config();
const { MUMBAI_OONE_TOKEN } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Deploying contracts with the account:", deployer.address);

  const RewardsDistributor = await ethers.getContractFactory("RewardsDistributor");
  const rewardsDistributor = await upgrades.deployProxy(RewardsDistributor, [MUMBAI_OONE_TOKEN, deployer.address], {
      initializer: "initialize",
  });

  console.log("RewardsDistributor address:", await rewardsDistributor.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

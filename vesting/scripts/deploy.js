require('dotenv').config();
const { MUMBAI_OONE_TOKEN } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Deploying contracts with the account:", deployer.address);

  const vesting = await ethers.deployContract("Vesting", [deployer.address, MUMBAI_OONE_TOKEN]);

  console.log("Vesting address:", await vesting.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

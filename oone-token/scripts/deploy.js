require('dotenv').config();
const { } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Deploying contracts with the account:", deployer.address);

  const ooneToken = await ethers.deployContract("OoneToken", [deployer.address]);

  console.log("OoneToken address:", await ooneToken.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

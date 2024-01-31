require('dotenv').config();
const { MUMBAI_VAULT } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Upgrading contracts with the account:", deployer.address);

  const Vault = await ethers.getContractFactory("Vault");
  const vault = await upgrades.upgradeProxy(MUMBAI_VAULT, Vault);

  console.log("Vault address:", await vault.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

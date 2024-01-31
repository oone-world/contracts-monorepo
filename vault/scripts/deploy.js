require('dotenv').config();
const { MUMBAI_OONE_TOKEN, MUMBAI_USDT_TOKEN, MUMBAI_REWARDS_DISTRIBUTOR_OONE, MUMBAI_REWARDS_DISTRIBUTOR_USDT } = process.env;

async function main() {
  const deployer = await ethers.provider.getSigner(0);
  
  console.log("Deploying contracts with the account:", deployer.address);

  const Vault = await ethers.getContractFactory("Vault");
  const vault = await upgrades.deployProxy(Vault, [MUMBAI_OONE_TOKEN, MUMBAI_USDT_TOKEN, MUMBAI_REWARDS_DISTRIBUTOR_OONE, MUMBAI_REWARDS_DISTRIBUTOR_USDT, 10n ** 16n, 5n * 10n ** 18n, deployer.address], {
      initializer: "initialize",
  });

  console.log("Vault address:", await vault.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

require('dotenv').config();
const { MUMBAI_PRIVATE_KEY } = process.env;
require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      accounts: {
        count: 20,
      }
    },
    mumbai: {
      gasPrice: 5000000000,
      url: 'https://rpc.ankr.com/polygon_mumbai',
      accounts: [MUMBAI_PRIVATE_KEY]
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ""
  },
};
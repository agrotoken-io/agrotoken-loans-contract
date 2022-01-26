import "@nomiclabs/hardhat-waffle";
import "hardhat-gas-reporter";
import '@openzeppelin/hardhat-upgrades';
import "@nomiclabs/hardhat-solhint";
import "hardhat-log-remover";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import "solidity-coverage";
import "hardhat-watcher";
import "@nomiclabs/hardhat-etherscan";
import "./tasks";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

export default {
  watcher: {
    test: {
      files: ["./test/**/*.ts","./contracts/**/*.sol"],
      verbose: true,
      tasks: ["test"],
    },
    coverage: {
      files: ["./test/**/*.ts","./contracts/**/*.sol"],
      verbose: true,
      tasks: ["coverage"],
    },
    check: {
      files: ["./contracts/**/*.sol"],
      verbose: true,
      tasks: ["check"],
    }
  },
  gasReporter: {
    enabled: process.env.NO_GAS_REPORTER === '1',
    currency: 'USD',
    coinmarketcap: process.env.CMC_TOKEN,
    gasPrice: 250
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_TOKEN
  },
  solidity: "0.8.7",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    hardhat: {
    },
    goerli: {
      url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    }
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5'
  },
};
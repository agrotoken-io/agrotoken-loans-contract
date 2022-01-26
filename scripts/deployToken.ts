import { ethers, upgrades } from "hardhat"
import readline from "readline"

export async function deployEscrow(privateKey:string) {
  const wallet = new ethers.Wallet(privateKey, ethers.provider)
  const Token = await ethers.getContractFactory("Agrotoken",wallet);
  const token = await Token.deploy();
  await token.deployed();

  console.log("SOYA deployed to:", token.address)
  console.log("Owner:", token.deployTransaction.from)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log("====== ONLY FOR LOCAL TEST ======")

rl.question("Private key? ", (privateKey)=>{
  deployEscrow(privateKey).then(() => process.exit(0)).catch(error => {
    console.error(error)
    process.exit(1)
  })
})
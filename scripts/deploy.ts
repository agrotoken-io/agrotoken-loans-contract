import { ethers, upgrades } from "hardhat"
import readline from "readline"

export async function deployLoans(privateKey:string) {
  const wallet = new ethers.Wallet(privateKey, ethers.provider)
  const Contract = await ethers.getContractFactory("AgrotokenLoan", wallet)
  const agtLoan = (await upgrades.deployProxy(Contract,[wallet.address]))
  await agtLoan.deployed()
  console.log("Loans contract deployed to:", agtLoan.address)
  console.log("Owner:", agtLoan.deployTransaction.from)
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question("Private key? ", (privateKey)=>{
  deployLoans(privateKey).then(() => process.exit(0)).catch(error => {
    console.error(error)
    process.exit(1)
  })
})
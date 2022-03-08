import { ethers, upgrades } from "hardhat"
import readline from "readline"

export async function deployLoans(privateKey:string) {
  const wallet = new ethers.Wallet(privateKey, ethers.provider)
  const Contract = await ethers.getContractFactory("AgrotokenLoan", wallet)
  const agtLoan = (await upgrades.deployProxy(Contract,
        ['0x2d3a0f0cb9b0238ab23423de29f49d7ca1e05882', //Wallet admin
          [
              '0xb99c9e436a630202e40c90ba9b65dcb610200066', //SOYA
              '0x891fde3771f8095e437754fc1a4aad6937378491', //CORA
              '0x1d48257386165d44e303c579386c46089b2775f5'  //WHEA
          ]
      ]))
  await agtLoan.deployed()
  console.log("Loans contract deployed to:", agtLoan.address)
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
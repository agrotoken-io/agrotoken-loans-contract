import { ethers, upgrades } from "hardhat"
import readline from "readline"

export async function deployLoans(privateKey:string) {
    const wallet = new ethers.Wallet(privateKey, ethers.provider)
    const Contract = await ethers.getContractFactory("AgrotokenLoan", wallet)
    await upgrades.upgradeProxy('0x9A9025b93754b941bcc86628B2045817fE2842DD', Contract)
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
import { ethers } from "hardhat"
import readline from "readline"
import * as Contracts from "../typechain"

export async function setTokenAllowed(privateKey: string, loanAddress: string ,tokenAddress:string) {
    const wallet = new ethers.Wallet(privateKey, ethers.provider)
    console.log('wallet', wallet.address)

    const Loan = Contracts.AgrotokenLoan__factory.connect(loanAddress, wallet)

    await Loan.updateAllowedToken(tokenAddress, true)
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

rl.question("Private key? ", (privateKey)=>{
    rl.question("Loan address? ", (loanAddress)=>{
        rl.question("Token address? ", (tokenAddress)=>{
            setTokenAllowed(privateKey,loanAddress, tokenAddress).then(() => process.exit(0)).catch(error => {
                console.error(error)
                process.exit(1)
            })
        })
    })
})
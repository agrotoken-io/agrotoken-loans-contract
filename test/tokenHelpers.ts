import { ethers, upgrades  } from 'hardhat'
import { Agrotoken } from '../src/types'

export const deployToken = async ():Promise<Agrotoken>=>{
  const Token = await ethers.getContractFactory("Agrotoken");
  const token = await Token.deploy() as Agrotoken;
  await token.deployed();
  return token
}

export const mint =  async (contract:Agrotoken, address:string, amount:number) => {
  const contractNumber = Math.trunc(Math.random()*1000)
  await contract.addNewGrainContract('1' ,`
    Token Id: 1
    User Id:51919718_61c1d9a5bf6c80.18177834
    Num.Contract: ${contractNumber}
    Contract date: 2022-03-07
    Tons: ${amount/10000}
    Complete date: 2021-12-29
    Tokenization Date: 2022-02-27`,
    amount)
  const tx = await contract.transfer(address,amount)
  const receipt = await tx.wait(0)
  return receipt
}

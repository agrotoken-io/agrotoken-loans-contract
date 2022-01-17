import { ethers, upgrades, network } from 'hardhat'
import { Signer } from "ethers";
import { expect } from "chai";

import { AgrotokenLoan, Agrotoken } from '../src/types'
import { deployToken, mint} from './tokenHelpers'
import { createLoan } from './factories'
import { LoanStateType } from './types'

interface IContext {
  signers: {
    owner:Signer, lender:Signer, user:Signer, thirdParty:Signer
  },
  agtLoan: AgrotokenLoan,
  soyaToken: Agrotoken
}

describe("AgrotokenLoan", function () {
  let context:IContext

  beforeEach(async () => {

    await network.provider.request({
      method: "hardhat_reset",
      params: [],
    });

    const [owner, lender, user, thirdParty] = await ethers.getSigners()
    const contract = await ethers.getContractFactory("AgrotokenLoan")
    const agtLoan = (await upgrades.deployProxy(contract)) as AgrotokenLoan
    const soyaToken = await deployToken()
    await mint(soyaToken, await user.getAddress(), 30000) //mint 30 tons and transfer to user

    context = { 
      signers: { owner, lender, user, thirdParty},
      agtLoan, 
      soyaToken
    }
  })

  it("Check Admin", async ()=> {
    const admin = await context.agtLoan.admin()
    expect(admin).to.eq(await context.signers.owner.getAddress())
  });

  it("AgrotokenLoan accepted tokens", async ()=> {
  
    const tokenAddress = context.soyaToken.address
    const tokenName = 'SOYA'
    await context.agtLoan.connect(context.signers.owner).addToken(tokenName,tokenAddress)
    expect(await context.agtLoan.allowedTokens(tokenAddress)).to.be.true
    expect(await context.agtLoan.tokenAlias(tokenName)).to.equal(tokenAddress)
  })

  it("Create loan", async ()=>{
    const userAddress= await context.signers.user.getAddress()
    const lenderAddress = await context.signers.lender.getAddress()
    const loan = createLoan('SOYA', 1000000, 1000, 7, 5, userAddress)
    const tx = context.agtLoan.connect(context.signers.lender)
      .createLoan(
        loan.hash,
        loan.tokenCollateral,
        loan.beneficiaryWallet,
        loan.dueIn,
        loan.interestPercentage,
        loan.fiatTotal,
        loan.tokenTotal,
        loan.localCurrency,
        loan.liquidationLimitPercentage,
        )
      await expect(tx).to.emit(context.agtLoan, 'LoanCreated').withArgs(loan.hash, lenderAddress, userAddress, loan.tokenTotal,context.soyaToken.address);
      expect(await context.agtLoan.loans(0)).to.equal(loan.hash)
     
     // const loanSaved = await context.agtLoan.getLoan(loan.hash)
     // test all values
  })


  it("Collateralize loan", async ()=>{
    const userAddress= await context.signers.user.getAddress()
    const loan = createLoan('SOYA', 1000000, 1000, 7, 5, userAddress)
    const txCreate = context.agtLoan.connect(context.signers.lender)
      .createLoan(
        loan.hash,
        loan.tokenCollateral,
        loan.beneficiaryWallet,
        loan.dueIn,
        loan.interestPercentage,
        loan.fiatTotal,
        loan.tokenTotal,
        loan.localCurrency,
        loan.liquidationLimitPercentage,
        )

    const approveTx = await context.soyaToken.connect(context.signers.user).approve(context.agtLoan.address,20000)
    const txCollateralize = context.agtLoan.connect(context.signers.user).collateralize(loan.hash)
    await expect(txCollateralize).to.emit(context.agtLoan, 'LoanCollateralized').withArgs(loan.hash)
    
    const updatedSaved = await context.agtLoan.getLoan(loan.hash)
    expect(updatedSaved.state).to.equal(LoanStateType.COLLATERALIZED)
  })

});
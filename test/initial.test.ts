import { ethers, upgrades  } from 'hardhat'
import { Signer } from "ethers";
import { expect } from "chai";

import { AgrotokenLoan } from '../src/types'
import { deployToken } from './tokenHelpers'

interface IContext {
  signers: {
    owner:Signer, lender:Signer, user:Signer, thirdParty:Signer
  },
  agtLoan: AgrotokenLoan
}

describe("AgrotokenLoan", function () {
  let context:IContext

  before(async () => {
    const [owner, lender, user, thirdParty] = await ethers.getSigners()
    const contract = await ethers.getContractFactory("AgrotokenLoan")
    const agtLoan = (await upgrades.deployProxy(contract)) as AgrotokenLoan
    context = { 
      signers: { owner, lender, user, thirdParty},
      agtLoan
    }

  })

  it("Check Admin", async ()=> {
    const admin = await context.agtLoan.admin()
    expect(admin).to.eq(await context.signers.owner.getAddress())
  });

  it("AgrotokenLoan accepted tokens", async ()=> {
    const soyaToken = await deployToken()
    const tokenAddress = soyaToken.address
    const tokenName = 'SOYA'
    await context.agtLoan.connect(context.signers.owner).addToken(tokenName,tokenAddress)
    expect(await context.agtLoan.allowedTokens(tokenAddress)).to.be.true
    expect(await context.agtLoan.tokenAlias(tokenName)).to.equal(tokenAddress)
  })

});
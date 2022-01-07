import { ethers, upgrades  } from 'hardhat'
import { Signer } from "ethers";
import { expect } from "chai";

import { AgrotokenLoan } from '../src/types'

describe("AgrotokenLoan", function () {
  let signers: Signer[];

  let agt: AgrotokenLoan

  beforeEach(async () => {
    signers = await ethers.getSigners()
    const Contract = await ethers.getContractFactory("AgrotokenLoan")
    agt = (await upgrades.deployProxy(Contract)) as AgrotokenLoan
  })

  it("Check Admin", async function () {
    const admin = await agt.admin()
    expect(admin).to.eq(await signers[0].getAddress())
  });

});
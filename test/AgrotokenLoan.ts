import { ethers, upgrades } from 'hardhat'
import * as Contracts  from "../src/types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {expect} from "chai";

describe('AgrotokenLoan', function() {

    let deployer: SignerWithAddress,
        owner: SignerWithAddress,
        holder: SignerWithAddress,
        bank: SignerWithAddress,
        thirdparty: SignerWithAddress,
        token: Contracts.Agrotoken,
        loan: Contracts.AgrotokenLoan

    const loanData = {
        hash: ethers.utils.solidityKeccak256(['string'], ['Loan1']),
        collateral: '',
        beneficiary: '',
        dueSeconds: 60 * 24 * 60,
        interest: .4 * 10 ** 4,
        earlyInterest: .03 * 10 ** 4,
        fiatTotal: 100 * 10 ** 4,
        //tokenTotal:
    }

    before(async function () {
        [deployer, owner, holder, bank, thirdparty] = await ethers.getSigners()

        token = await new Contracts.Agrotoken__factory().deploy()
        loan = await upgrades.deployProxy(await ethers.getContractFactory("AgrotokenLoan"),[owner.address]) as Contracts.AgrotokenLoan

        loanData.collateral = token.address
        loanData.beneficiary = holder.address

        await token.addNewGrainContract('' , ``, ethers.utils.parseUnits('100','ether'))
    })

    describe("Create a loan", () => {
        it("create a loan should be possible", async () => {
            loan.createLoan(
                uint256 fiatTotal_,
                uint256 tokenTotal_,
                LocalCurrencies localCurrency_,
                uint8 liquidationLimitPercentage_
            )
        })
        it("create duplicated loan should be reverted", async () => {

        })
    })

    describe('verifyPriceSignature', () => {
        it('Valid signature and expiry should succeed', async () => {
            const tokenPrice = ethers.utils.parseUnits('25',4)

            const lastBlock = await ethers.provider.getBlock('latest')
            const validUntil = lastBlock.timestamp + (100 * 1000)

            const messageHashString = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [tokenPrice, validUntil])
            const messageHashBytes = ethers.utils.arrayify(messageHashString)

            const signature = await bank.signMessage(messageHashBytes)
            const isValid = await loan.verifyPriceSignature(bank.address, tokenPrice, validUntil, lastBlock.timestamp, signature)

            expect(isValid).eq(true)
        });
    })

})
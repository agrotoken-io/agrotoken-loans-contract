import { ethers, upgrades } from 'hardhat'
import * as Contracts  from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { LocalCurrency } from "./types";
import { parseUnits } from "./utils";


describe('AgrotokenLoan', function() {

    let deployer: SignerWithAddress,
        owner: SignerWithAddress,
        holder: SignerWithAddress,
        bank: SignerWithAddress,
        thirdparty: SignerWithAddress,
        token: Contracts.Agrotoken,
        loan: Contracts.AgrotokenLoan

    const tokenPrice = 300;

    before(async function () {
        [deployer, owner, holder, bank, thirdparty] = await ethers.getSigners()

        //@ts-ignore
        token = await new Contracts.Agrotoken__factory(deployer).deploy()
        loan = await upgrades.deployProxy(await ethers.getContractFactory("AgrotokenLoan"),[owner.address]) as Contracts.AgrotokenLoan

        await token.addNewGrainContract('' , ``, ethers.utils.parseUnits('100','ether'))
    })

    describe("Create a loan", () => {
        let loanData: any
        before(async () => {
            loanData = {
                hash: ethers.utils.solidityKeccak256(['string'], ['Loan1']),
                collateral: token.address,
                beneficiary: holder.address,
                dueSeconds: 60 * 24 * 60,
                interest: parseUnits(0.4, 4),
                earlyInterest: parseUnits(0.03, 4),
                fiatTotal: 100,
                tokenTotal: parseUnits(0.5, 4), //150% collateralization
                localCurrency: LocalCurrency.ARS,
                liquidationLimitPercentage: parseUnits(1.1, 4)
            }
        })
        it("create a loan with not allowed token should fail", async () => {
            await expect(loan.createLoan(
                loanData.hash,
                loanData.collateral,
                loanData.beneficiary,
                loanData.dueSeconds,
                loanData.interest,
                loanData.earlyInterest,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )).revertedWith('Token not allowed')
        })
        it("create a loan should be possible", async () => {
            await loan.connect(owner).updateAllowedToken(token.address, true)
            await loan.createLoan(
                loanData.hash,
                loanData.collateral,
                loanData.beneficiary,
                loanData.dueSeconds,
                loanData.interest,
                loanData.earlyInterest,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )
        })
        it("create duplicated loan should be reverted", async () => {
            await expect(loan.createLoan(
                loanData.hash,
                loanData.collateral,
                loanData.beneficiary,
                loanData.dueSeconds,
                loanData.interest,
                loanData.earlyInterest,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )).revertedWith('Loan already registered')
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
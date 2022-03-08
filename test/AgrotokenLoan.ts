import { ethers, upgrades, time } from 'hardhat'
import * as Contracts  from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import { LoanStateType } from "./types";
import { parseUnits } from "./utils";
import {describe} from "mocha";


describe('AgrotokenLoan', function() {

    let deployer: SignerWithAddress,
        owner: SignerWithAddress,
        beneficiary: SignerWithAddress,
        bank: SignerWithAddress,
        thirdparty: SignerWithAddress,
        token: Contracts.Agrotoken,
        tokenSample: Contracts.Agrotoken[],
        loanContract: Contracts.AgrotokenLoan,
        loanData: any,
        closeSnapshot: any

    before(async function () {
        [deployer, owner, beneficiary, bank, thirdparty] = await ethers.getSigners()

        //@ts-ignore
        token = await new Contracts.Agrotoken__factory(deployer).deploy()

        tokenSample = [
            await new Contracts.Agrotoken__factory(deployer).deploy(),
            await new Contracts.Agrotoken__factory(deployer).deploy()
        ]

        loanContract = await upgrades.deployProxy(await ethers.getContractFactory("AgrotokenLoan"),[owner.address, tokenSample.map(t => t.address)]) as Contracts.AgrotokenLoan

        loanData = {
            hash: ethers.utils.solidityKeccak256(['string'], ['Loan1']),
            beneficiary: beneficiary.address,
            collateral: token.address,
            collateralAmount: parseUnits(10, 4)
        }
    })

    it("initial allowed tokens should be valid", async () => {
        await Promise.all(tokenSample.map(async (token_) => {
            expect(
                await loanContract.allowedTokens(token_.address)
            ).be.eq(true)
        }))
        expect(
            await loanContract.allowedTokens(token.address)
        ).be.eq(false)
    })

    describe("Create a loan", () => {
        let loan: Contracts.AgrotokenLoan
        before(() => {
            loan = loanContract.connect(bank)
        })
        it("initia state of a loan should be not existant", async () => {
            expect(
                await loan.state(loanData.hash)
            ).be.eq(LoanStateType.NOT_EXISTENT)
        })
        it("create a loan with not allowed token should fail", async () => {
            await expect(loan.createLoan(
                loanData.hash,
                loanData.beneficiary,
                loanData.collateral,
                loanData.collateralAmount
            )).revertedWith('Token not allowed')
        })
        it("create a loan should be possible", async () => {
            await loan.connect(owner).updateAllowedToken(token.address, true)
            await loan.createLoan(
                loanData.hash,
                loanData.beneficiary,
                loanData.collateral,
                loanData.collateralAmount
            )
        })
        it("initia state of a loan should be crated", async () => {
            expect(
                await loan.state(loanData.hash)
            ).be.eq(LoanStateType.CREATED)
        })
        it("create duplicated loan should be reverted", async () => {
            await expect(loan.createLoan(
                loanData.hash,
                loanData.beneficiary,
                loanData.collateral,
                loanData.collateralAmount
            )).revertedWith('Loan already registered')
        })
        it("cancel a created loan should be possible", async () => {
            const statusSnapshot = await time.snapshot()
            await loan.cancelLoan(loanData.hash)
            const loanStatus = await loan.state(loanData.hash)
            await time.revert(statusSnapshot)
            expect(loanStatus).be.eq(LoanStateType.CANCELED)
        })
    })

    describe("Collateralize", () => {
        let loan: Contracts.AgrotokenLoan
        before(() => {
            loan = loanContract.connect(beneficiary)
        })
        it("invoke from other account than beneficiary should fail", async () => {
            await expect(
                loanContract.connect(thirdparty).acceptLoan(loanData.hash)
            ).revertedWith('Invalid sender')
        })
        it("collateralize without allowance should revert", async () => {
            await expect(
                loan.acceptLoan(loanData.hash)
            ).revertedWith('Value informed is invalid')
        })
        it("collateralize without balance should revert", async () => {
            await token.connect(beneficiary).approve(loanContract.address, loanData.collateralAmount)
            await expect(
                loan.acceptLoan(loanData.hash)
            ).revertedWith('Invalid Transfer Operation')
        })
        it("collateralize should succeed", async () => {
            await token.addNewGrainContract('', '', loanData.collateralAmount)
            await token.transfer(beneficiary.address, loanData.collateralAmount)
            await loan.acceptLoan(loanData.hash)
            expect(
                await token.balanceOf(loan.address)
            ).be.eq(loanData.collateralAmount)
        })
        it("loan state sould be collateralized", async () => {
            expect(
                await loan.state(loanData.hash)
            ).be.eq(LoanStateType.COLLATERALIZED)
        })
        it("cancel collateralized loan should be possible", async () => {
            const statusSnapshot = await time.snapshot()
            await expect(
                () => loan.connect(bank).cancelLoan(loanData.hash)
            ).to.changeTokenBalances(
                token,
                [loan                      , beneficiary              ],
                [-loanData.collateralAmount, loanData.collateralAmount]
            )
            const loanStatus = await loan.state(loanData.hash)
            await time.revert(statusSnapshot)
            expect(loanStatus).be.eq(LoanStateType.CANCELED)
        })
    })

    describe('Release', () => {
        before(async () => {
            closeSnapshot = await time.snapshot()
        })
        it("call from thirdparty shoud fail", async () => {
            await expect(
                loanContract.connect(beneficiary).releaseCollateral(loanData.hash)
            ).revertedWith("Invalid sender")
        })
        it("call from bank should succeed", async () => {
            await loanContract.connect(bank).releaseCollateral(loanData.hash)
        })
        it("loan state should be updated", async () => {
            expect(
                await loanContract.state(loanData.hash)
            ).be.eq(LoanStateType.ENDED)
        })
        it("balances should be refelcted", async () => {
            expect(
                await token.balanceOf(loanContract.address)
            ).be.eq(0)
            expect(
                await token.balanceOf(beneficiary.address)
            ).be.eq(loanData.collateralAmount)
        })
        it("close loan twice should fail", async () => {
            await expect(
                loanContract.connect(bank).releaseCollateral(loanData.hash)
            ).revertedWith("Invalid state")
        })
        it("cancel released loan should be not possible", async () => {
            await expect(
                loanContract.connect(bank).cancelLoan(loanData.hash)
            ).revertedWith("Invalid state")
        })
    })

    describe("Distribute", () => {
        before(async () => {
            await time.revert(closeSnapshot)
        })
        it("call from thirdparty shoud fail", async () => {
            await expect(
                loanContract.connect(beneficiary).distributeCollateral(loanData.hash, parseUnits(1, 4))
            ).revertedWith("Invalid sender")
        })
        it("call from bank should succeed", async () => {
            await loanContract.connect(bank).distributeCollateral(loanData.hash, parseUnits(1, 4))
        })
        it("loan state should be updated", async () => {
            expect(
                await loanContract.state(loanData.hash)
            ).be.eq(LoanStateType.ENDED)
        })
        it("balances should be refelcted", async () => {
            expect(
                await token.balanceOf(loanContract.address)
            ).be.eq(0)
            expect(
                await token.balanceOf(beneficiary.address)
            ).be.eq(parseUnits(9, 4))
            expect(
                await token.balanceOf(bank.address)
            ).be.eq(parseUnits(1, 4))
        })
        it("cancel distributed loan should be not possible", async () => {
            await expect(
                loanContract.connect(bank).cancelLoan(loanData.hash)
            ).revertedWith("Invalid state")
        })
    })
})
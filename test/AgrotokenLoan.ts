import { ethers, upgrades } from 'hardhat'
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
        loanContract: Contracts.AgrotokenLoan,
        loanData: any

    before(async function () {
        [deployer, owner, beneficiary, bank, thirdparty] = await ethers.getSigners()

        //@ts-ignore
        token = await new Contracts.Agrotoken__factory(deployer).deploy()

        loanContract = await upgrades.deployProxy(await ethers.getContractFactory("AgrotokenLoan"),[owner.address]) as Contracts.AgrotokenLoan

        loanData = {
            hash: ethers.utils.solidityKeccak256(['string'], ['Loan1']),
            beneficiary: beneficiary.address,
            collateral: token.address,
            collateralAmount: parseUnits(10, 4)
        }
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
    })

    describe("Collateralize", async () => {
        let loan: Contracts.AgrotokenLoan
        before(() => {
            loan = loanContract.connect(beneficiary)
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
        })
        it("loan state sould be collateralized", async () => {
            expect(
                await loan.state(loanData.hash)
            ).be.eq(LoanStateType.COLLATERALIZED)
        })
    })
})
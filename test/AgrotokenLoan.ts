import { ethers, upgrades } from 'hardhat'
import * as Contracts  from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { expect } from "chai";
import {LoanStateType, LocalCurrency} from "./types";
import { parseUnits, daysToSeconds } from "./utils";
import moment from "moment";


describe('AgrotokenLoan', function() {

    let deployer: SignerWithAddress,
        owner: SignerWithAddress,
        bank: SignerWithAddress,
        thirdparty: SignerWithAddress,
        accounts: SignerWithAddress[],
        tokens: {
            WHEA: Contracts.Agrotoken,
            CORA: Contracts.Agrotoken,
            SOYA: Contracts.Agrotoken
        },
        loan: Contracts.AgrotokenLoan

    const tokenPrice = 300;

    before(async function () {
        [deployer, owner, bank, thirdparty, ...accounts] = await ethers.getSigners()

        //@ts-ignore
        tokens = {
            'WHEA': await new Contracts.Agrotoken__factory(deployer).deploy(),
            'CORA': await new Contracts.Agrotoken__factory(deployer).deploy(),
            'SOYA': await new Contracts.Agrotoken__factory(deployer).deploy()
        }

        loan = await upgrades.deployProxy(await ethers.getContractFactory("AgrotokenLoan"),[owner.address]) as Contracts.AgrotokenLoan
    })

    describe("Create a loan", () => {
        let loanData: any
        before(async () => {
            loanData = {
                hash: ethers.utils.solidityKeccak256(['string'], ['Loan1']),
                collateral: tokens.WHEA.address,
                beneficiary: thirdparty.address,
                dueSeconds: 60 * 24 * 60,
                interest: parseUnits(0.4, 4),
                earlyInterest: parseUnits(0.03, 4),
                fiatTaxes: parseUnits(0.07, 4),
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
                loanData.fiatTaxes,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )).revertedWith('Token not allowed')
        })
        it("create a loan should be possible", async () => {
            await loan.connect(owner).updateAllowedToken(tokens.WHEA.address, true)
            await loan.createLoan(
                loanData.hash,
                loanData.collateral,
                loanData.beneficiary,
                loanData.dueSeconds,
                loanData.interest,
                loanData.earlyInterest,
                loanData.fiatTaxes,
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
                loanData.fiatTaxes,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )).revertedWith('Loan already registered')
        })
        it("loan state should be CREATED", async () => {
            expect(
                await loan.state(loanData.hash)
            ).eq(LoanStateType.CREATED)
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

    describe("La Basilicata", () => {
        let loanData: any
        before(async () => {
            loanData = {
                hash: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
                collateral: tokens.WHEA,
                beneficiary: accounts[0],
                dueSeconds: daysToSeconds(8),
                interest: parseUnits(.4, 4),
                earlyInterest: parseUnits(.03, 4),
                fiatTaxes: parseUnits(.07, 4),
                fiatTotal: parseUnits(100000, 4),
                tokenTotal: parseUnits(4.62, 4),
                localCurrency: LocalCurrency.ARS,
                liquidationLimitPercentage: parseUnits(.15, 4),
                tokenPrice: parseUnits(230, 4)
            }
            await loan.connect(owner).updateAllowedToken(tokens.WHEA.address, true)
        })
        it("create loan", async () => {
            await loanData.collateral.addNewGrainContract('', '', loanData.tokenTotal)
            await loanData.collateral.transfer(loanData.beneficiary.address, loanData.tokenTotal);
            await loan.connect(bank).createLoan(
                loanData.hash,
                loanData.collateral.address,
                loanData.beneficiary.address,
                loanData.dueSeconds,
                loanData.interest,
                loanData.earlyInterest,
                loanData.fiatTaxes,
                loanData.fiatTotal,
                loanData.tokenTotal,
                loanData.localCurrency,
                loanData.liquidationLimitPercentage
            )
        })
        it("accept loan", async () => {
            await loanData.collateral.connect(loanData.beneficiary).approve(loan.address,loanData.tokenTotal)
            await expect(
                loan.connect(loanData.beneficiary).acceptLoan(loanData.hash)
            ).to.be.emit(loan, "LoanStatusUpdate").withArgs(loanData.hash, LoanStateType.COLLATERALIZED)
            expect(
                await loanData.collateral.balanceOf(loanData.beneficiary.address)
            ).be.eq(0)
        })
        it("activate loan", async () => {
            loanData.loanStartTimestamp = moment().subtract(1, 'days')
            loanData.loanDueTimestamp = loanData.loanStartTimestamp.clone().add(8, 'days')
            await expect(
                loan.connect(bank).activateLoan(loanData.hash, loanData.loanStartTimestamp.unix())
            ).emit(loan, "LoanStatusUpdate").withArgs(loanData.hash, LoanStateType.ACTIVE)
            expect(
                await loan.dueTimestamp(loanData.hash)
            ).be.eq(loanData.loanDueTimestamp.unix())
        })
        it("pay with fiat", async () => {
            await ethers.provider.send("evm_setNextBlockTimestamp", [loanData.loanDueTimestamp.unix()])

            await expect(
                loan.connect(bank).paidInFiat(loanData.hash, loanData.tokenPrice)
            ).emit(loan, 'LoanFees').withArgs(
                loanData.hash,
                parseUnits(876.7123, 4),
                0,
                loanData.tokenPrice,
                loanData.tokenTotal
            )
            expect(
                await loanData.collateral.balanceOf(loanData.beneficiary.address)
            ).be.eq(loanData.tokenTotal)
        })
    })

})
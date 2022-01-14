import { ILoanBlockchain, CryptoCurrencySymbol } from "./types";
import { utils } from "ethers";

const LIQ_LIMIT = 50
const LOCAL_CURRENCY = "ARS"

const toFiatBN = (value:number) => (Math.round(value*100))
const toTokenBN = (value:number) => (Math.round(value*10000))
const toPercentageBN = (value:number) => (Math.round(value*10000))   // percentage with 2 decimals, like 5.20%

export const createLoan = (
    tokenCollateral: CryptoCurrencySymbol,
    fiatTotal: number,
    tokenTotal: number,
    dueIn: number,
    interestPercentage:number,
    beneficiaryWallet:string,
  ): ILoanBlockchain => {
    const loan = {
      tokenCollateral,
      fiatTotal: toFiatBN(fiatTotal),
      tokenTotal: toTokenBN(tokenTotal),
      localCurrency: LOCAL_CURRENCY,
      dueIn,
      liquidationLimitPercentage: LIQ_LIMIT,
      interestPercentage,
      beneficiaryWallet
    }
    return ({
      hash: utils.id(JSON.stringify(loan)),
      ...loan
    }) as ILoanBlockchain
  }
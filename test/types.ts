export type CryptoCurrencySymbol = 'SOYA' | 'CORA' | 'WHEA'

export type FiatCurrencySymbol = 'USD' | 'ARS'

export enum LoanStateType {
  CREATED = 1,
  COLLATERALIZED = 2,
  ACTIVE = 3,
  CANCELLED = 4,
  PAID_FIAT_DUE = 5,
  PAID_TOKENS_DUE = 6,
  PAID_FIAT_EARLY = 7,
  PAID_TOKENS_EARLY = 8,
  PAID_TOKENS_LOW_COLLATERAL = 9
}

export interface ILoanBlockchain {
  hash: string
  status?: number 
  tokenCollateral: CryptoCurrencySymbol
  fiatTotal: number
  tokenTotal: number
  localCurrency: FiatCurrencySymbol
  dueIn: number
  interestPercentage:  number
  liquidationLimitPercentage: number
  providerWallet?: string
  beneficiaryWallet: string 
 }
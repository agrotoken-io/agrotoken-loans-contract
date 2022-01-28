import * as Contracts from "../typechain";

export type CryptoCurrencySymbol = 'SOYA' | 'CORA' | 'WHEA'

export enum LocalCurrency {
  ARS = 0,
  USD = 1
}

export enum LoanStateType {
  NOT_EXISTENT = 0,
  CREATED = 1,
  COLLATERALIZED = 2,
  ACTIVE = 3,
  CANCELLED = 4,
  PAID_FIAT_DUE = 5,
  PAID_TOKENS_DUE = 6,
  PAID_FIAT_EARLY = 7,
  PAID_TOKENS_EARLY = 8,
  PAID_TOKENS_LOW_COLLATERAL =9
}
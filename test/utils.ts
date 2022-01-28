import BigNumber from "bignumber.js";

const ten = new BigNumber(10)

export function parseUnits(value: string|number, decimals: number){
    const value_ = new BigNumber(value)
    const decimals_ = new BigNumber(decimals)
    return value_.times(ten.pow(decimals_)).toFixed(0, BigNumber.ROUND_FLOOR)
}

export function daysToSeconds(days: number) {
    return days * 24 * 60 * 60
}
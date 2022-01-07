/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { AgrotokenLoan, AgrotokenLoanInterface } from "../AgrotokenLoan";

const _abi = [
  {
    inputs: [],
    name: "admin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506104e5806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80638129fc1c1461003b578063f851a44014610045575b600080fd5b610043610063565b005b61004d6101e9565b60405161005a9190610363565b60405180910390f35b600060019054906101000a900460ff1661008b5760008054906101000a900460ff1615610094565b61009361020f565b5b6100d3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016100ca906103ae565b60405180910390fd5b60008060019054906101000a900460ff161590508015610123576001600060016101000a81548160ff02191690831515021790555060016000806101000a81548160ff0219169083151502179055505b33600060026101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506101c56040518060400160405280601781526020017f4465706c6f79696e67204167726f746f6b656e4c6f616e000000000000000000815250600060029054906101000a900473ffffffffffffffffffffffffffffffffffffffff16610220565b80156101e65760008060016101000a81548160ff0219169083151502179055505b50565b600060029054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600061021a306102bc565b15905090565b6102b8828260405160240161023692919061037e565b6040516020818303038152906040527f319af333000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff19166020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506102cf565b5050565b600080823b905060008111915050919050565b60008151905060006a636f6e736f6c652e6c6f679050602083016000808483855afa5050505050565b610301816103ea565b82525050565b6000610312826103ce565b61031c81856103d9565b935061032c81856020860161041c565b6103358161044f565b840191505092915050565b600061034d602e836103d9565b915061035882610460565b604082019050919050565b600060208201905061037860008301846102f8565b92915050565b600060408201905081810360008301526103988185610307565b90506103a760208301846102f8565b9392505050565b600060208201905081810360008301526103c781610340565b9050919050565b600081519050919050565b600082825260208201905092915050565b60006103f5826103fc565b9050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60005b8381101561043a57808201518184015260208101905061041f565b83811115610449576000848401525b50505050565b6000601f19601f8301169050919050565b7f496e697469616c697a61626c653a20636f6e747261637420697320616c72656160008201527f647920696e697469616c697a656400000000000000000000000000000000000060208201525056fea26469706673582212205caf562aafeebb4cd9d7eea5e85c80bbfdb54c1f6af483e524f1a436c4249e7a64736f6c63430008070033";

type AgrotokenLoanConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: AgrotokenLoanConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class AgrotokenLoan__factory extends ContractFactory {
  constructor(...args: AgrotokenLoanConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<AgrotokenLoan> {
    return super.deploy(overrides || {}) as Promise<AgrotokenLoan>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): AgrotokenLoan {
    return super.attach(address) as AgrotokenLoan;
  }
  connect(signer: Signer): AgrotokenLoan__factory {
    return super.connect(signer) as AgrotokenLoan__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): AgrotokenLoanInterface {
    return new utils.Interface(_abi) as AgrotokenLoanInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): AgrotokenLoan {
    return new Contract(address, _abi, signerOrProvider) as AgrotokenLoan;
  }
}

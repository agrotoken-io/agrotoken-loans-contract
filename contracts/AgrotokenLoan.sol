/*
SPDX-License-Identifier: UNLICENSED
(c) Developed by AgroToken
This work is unlicensed.
*/
pragma solidity 0.8.7;
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AgrotokenLoan is Initializable {
  address public admin;
  mapping(address => bool) public allowedTokens;
  mapping(string => address) public tokenAlias;


  enum LoanState {
    NOT_EXISTENT,
    CREATED,
    COLLATERALIZED,
    ACTIVE,
    CANCELLED,
    PAID_FIAT_DUE,
    PAID_TOKENS_DUE,
    PAID_FIAT_EARLY,
    PAID_TOKENS_EARLY,
    PAID_TOKENS_LOW_COLLATERAL
  }

  mapping(bytes32 => address) collateral;
  mapping(bytes32 => address) lender;
  mapping(bytes32 => address) beneficiary;
  mapping(bytes32 => uint24) dueIn;
  mapping(bytes32 => uint8) interest;
  mapping(bytes32 => uint256) fiatTotal;
  mapping(bytes32 => string) localCurrency;
  mapping(bytes32 => uint8) liquidationLimitPercentage;
  mapping(bytes32 => uint256) tokenTotal;
  mapping(bytes32 => LoanState) state;
  mapping(bytes32 => uint256) created;
  mapping(bytes32 => uint256) funded;

  bytes32[] public loans;

  event LoanCreated(bytes32 indexed loanHash, address indexed lender, address indexed beneficiary, uint256 tokens, address collateral);

  function initialize() public initializer{
    admin = msg.sender;
    console.log("Deploying AgrotokenLoan", admin);
  }

  function addToken(string memory name, address token) public {   // adminOnly
    require(token != address(0), "Token address cannot be zero address");
    bytes memory tempEmptyStringTest = bytes(name);
    require(tempEmptyStringTest.length != 0, "Invalid token name");
    require(!allowedTokens[token] && tokenAlias[name]== address(0), "Token already added");
    allowedTokens[token] = true;
    tokenAlias[name] = token;
  }

  function createLoan(
    bytes32 hash,
    string memory collateralName,
    address beneficiary_,
    uint24 dueIn_,
    uint8 interest_,
    uint256 fiatTotal_,
    uint256 tokenTotal_,
    string memory localCurrency_,
    uint8 liquidationLimitPercentage_
  ) public {
    
    require(allowedTokens[tokenAlias[collateralName]], "Token not allowed");
    require(beneficiary_ != address(0), "Beneficiary cannot be zero address");
    require(beneficiary_ != msg.sender, "Beneficiary is invalid");
    require(fiatTotal_!=0 && tokenTotal_!=0 && dueIn_!=0, "Amounts cannot be zero");

    bytes memory tempEmptyStringTest = bytes(localCurrency_);
    require(tempEmptyStringTest.length != 0, "Invalid local currency");

    address collateral_ = tokenAlias[collateralName];
    
    lender[hash] = msg.sender;
    collateral[hash] = collateral_;
    beneficiary[hash] = beneficiary_;
    dueIn[hash] = dueIn_;
    interest[hash] = interest_;
    fiatTotal[hash] = fiatTotal_;
    localCurrency[hash] = localCurrency_;
    tokenTotal[hash] = tokenTotal_;
    liquidationLimitPercentage[hash] = liquidationLimitPercentage_;
    state[hash] = LoanState.CREATED;
    created[hash] = block.timestamp;
    loans.push(hash);
    emit LoanCreated(hash, msg.sender, beneficiary_, tokenTotal_, collateral_);
  }
}
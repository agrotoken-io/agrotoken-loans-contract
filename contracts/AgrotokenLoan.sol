/*
SPDX-License-Identifier: UNLICENSED
(c) Developed by AgroToken
This work is unlicensed.
*/
pragma solidity 0.8.7;
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract AgrotokenLoan is Initializable, OwnableUpgradeable {
  using ECDSAUpgradeable for bytes32;

  mapping(IERC20Upgradeable => bool) public allowedTokens;

  mapping(bytes32 => IERC20Upgradeable) public collateral;
  mapping(bytes32 => address) public lender;
  mapping(bytes32 => address) public beneficiary;
  mapping(bytes32 => uint256) public dueSeconds;
  mapping(bytes32 => uint256) public dueTimestamp;
  mapping(bytes32 => uint256) public interest;
  mapping(bytes32 => uint256) public earlyInterest;
  mapping(bytes32 => uint256) public fiatTaxes;
  mapping(bytes32 => uint256) public fiatTotal;
  mapping(bytes32 => LocalCurrencies) public localCurrency;
  mapping(bytes32 => uint256) public liquidationLimitPercentage;
  mapping(bytes32 => uint256) public tokenTotal;
  mapping(bytes32 => LoanState) public state;

  uint256 public constant DECIMAL_FACTOR = 10 ** 4;

  enum LocalCurrencies {
    ARS
  }

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

  event LoanStatusUpdate(bytes32 indexed loanHash, LoanState indexed status);

  function initialize(address owner) public initializer {
    __Ownable_init();
    _transferOwnership(owner);
  }

  function updateAllowedToken(IERC20Upgradeable token, bool allowed) public onlyOwner {   // adminOnly
    require(token != IERC20Upgradeable(address(0)), "Token address cannot be zero address");
    allowedTokens[token] = allowed;
  }

  function createLoan(
    bytes32 hash,
    IERC20Upgradeable collateral_,
    address beneficiary_,
    uint256 dueSeconds_,
    uint256 interest_,
    uint256 earlyInterest_,
    uint256 fiatTaxes_,
    uint256 fiatTotal_,
    uint256 tokenTotal_,
    LocalCurrencies localCurrency_,
    uint256 liquidationLimitPercentage_
  ) public {
    require(allowedTokens[collateral_], "Token not allowed");
    require(state[hash] == LoanState.NOT_EXISTENT, "Loan already registered");
    require(beneficiary_ != address(0), "Beneficiary cannot be zero address");
    require(beneficiary_ != msg.sender, "Beneficiary is invalid");
    require(fiatTotal_!=0 && tokenTotal_!=0 && dueSeconds_!=0, "Amounts cannot be zero");

    lender[hash] = msg.sender;
    collateral[hash] = collateral_;
    beneficiary[hash] = beneficiary_;
    dueSeconds[hash] = dueSeconds_;
    interest[hash] = interest_;
    earlyInterest[hash] = earlyInterest_;
    fiatTaxes[hash] = fiatTaxes_;
    fiatTotal[hash] = fiatTotal_;
    localCurrency[hash] = localCurrency_;
    tokenTotal[hash] = tokenTotal_;
    liquidationLimitPercentage[hash] = liquidationLimitPercentage_;
    state[hash] = LoanState.CREATED;

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function cancelLoan(bytes32 hash) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(
      state[hash] == LoanState.CREATED
      || state[hash] == LoanState.COLLATERALIZED
    , "Invalid loan state");

    bool isCollateralized = state[hash] == LoanState.COLLATERALIZED;
    state[hash] = LoanState.CANCELLED;

    if (isCollateralized) {
      collateral[hash].transferFrom(address(this), beneficiary[hash], tokenTotal[hash]);
    }

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function acceptLoan(bytes32 hash) external {
    require(beneficiary[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.CREATED, "Invalid loan state");

    collateral[hash].transferFrom(msg.sender, address(this), tokenTotal[hash]);

    state[hash] = LoanState.COLLATERALIZED;

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function activateLoan(bytes32 hash, uint256 activatedAt) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.COLLATERALIZED, "Invalid state");
    require(activatedAt <= block.timestamp, "Invalid activation timestamp");

    state[hash] = LoanState.ACTIVE;
    dueTimestamp[hash] = activatedAt + dueSeconds[hash];

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function computeBaseInterest(bytes32 hash, uint256 atTimestamp) public view returns(uint256) {
    require(state[hash] == LoanState.ACTIVE, "Invalid state");
    uint256 dueMargin = dueSeconds[hash];
    if (atTimestamp <  dueTimestamp[hash]) {
      dueMargin = dueMargin - (dueTimestamp[hash] - atTimestamp);
    }
    return ((fiatTotal[hash] * interest[hash]) / DECIMAL_FACTOR) * dueMargin / 365 days;
  }

  function computeEarlyInterest(bytes32 hash, uint256 atTimestamp) public view returns(uint256) {
    require(state[hash] == LoanState.ACTIVE, "Invalid state");
    uint256 p25 = (dueSeconds[hash] * 25) / 100;
    if (dueTimestamp[hash] - p25 < atTimestamp) {
      return 0;
    }
    return ((fiatTotal[hash] * earlyInterest[hash]) / DECIMAL_FACTOR) * (dueTimestamp[hash] - atTimestamp) / 365 days;
  }

  function paidInFiat(bytes32 hash) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.ACTIVE, "Invalid state");

    uint256 maxDueTimestamp = dueTimestamp[hash] + 1 days;
    require(maxDueTimestamp >= block.timestamp, "Loan due");

    if (dueTimestamp[hash] >= block.timestamp) {
      state[hash] = LoanState.PAID_FIAT_EARLY;
    } else {
      state[hash] = LoanState.PAID_FIAT_DUE;
    }

    collateral[hash].transfer(beneficiary[hash], tokenTotal[hash]);

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function _paidInToken(bytes32 hash, uint256 tokenPrice) internal {
    require(state[hash] == LoanState.ACTIVE, "Invalid state");

    uint256 fee = computeBaseInterest(hash, block.timestamp + 7 days);

    if (dueTimestamp[hash] >= block.timestamp){
      state[hash] = LoanState.PAID_TOKENS_EARLY;
      fee = fee + computeEarlyInterest(hash, block.timestamp);
    } else {
      state[hash] = LoanState.PAID_TOKENS_DUE;
    }

    fee = (fee * fiatTaxes[hash]) / DECIMAL_FACTOR;

    uint256 tokensForLender = ((fiatTotal[hash] + fee) * DECIMAL_FACTOR) / tokenPrice;
    require(tokenTotal[hash] > tokensForLender, "Loan dafualted");
    uint256 tokensForBeneficiary = tokenTotal[hash] - tokensForLender;

    require(
      collateral[hash].transfer(lender[hash], tokensForLender)
      &&
      collateral[hash].transfer(beneficiary[hash], tokensForBeneficiary)
    ,"Can not transfer");

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function verifyPriceSignature(address signer, uint256 price, uint256 validUntil, uint256 timestamp, bytes memory signature) public pure returns (bool) {
    if (validUntil >= timestamp){
      bytes32 priceHash = keccak256(abi.encodePacked(price, validUntil)).toEthSignedMessageHash();
      return priceHash.recover(signature) == signer;
    }
    return false;
  }

  function paidInToken(bytes32 hash, uint256 tokenPrice, uint256 priceExpiry, bytes memory bankSignature) external {
    require(beneficiary[hash] == msg.sender, "Invalid sender");
    require(verifyPriceSignature(lender[hash], tokenPrice, priceExpiry, block.timestamp, bankSignature), "Invalid signature");

    _paidInToken(hash, tokenPrice);
  }


  function executeDueLoan(bytes32 hash, uint256 tokenPrice) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(dueTimestamp[hash] > block.timestamp, "Loan not due");

    _paidInToken(hash, tokenPrice);
  }

}
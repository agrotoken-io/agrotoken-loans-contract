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

  mapping(bytes32 => IERC20Upgradeable) collateral;
  mapping(bytes32 => address) lender;
  mapping(bytes32 => address) beneficiary;
  mapping(bytes32 => uint256) dueSeconds;
  mapping(bytes32 => uint256) dueTimestamp;
  mapping(bytes32 => uint8) interest;
  mapping(bytes32 => uint8) earlyInterest;
  mapping(bytes32 => uint256) fiatTotal;
  mapping(bytes32 => LocalCurrencies) localCurrency;
  mapping(bytes32 => uint8) liquidationLimitPercentage;
  mapping(bytes32 => uint256) tokenTotal;
  mapping(bytes32 => LoanState) state;

  uint256 public constant PERCENT_DECIMAL = 10 ** 4;

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
    uint8 interest_,
    uint8 earlyInterest_,
    uint256 fiatTotal_,
    uint256 tokenTotal_,
    LocalCurrencies localCurrency_,
    uint8 liquidationLimitPercentage_
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
    fiatTotal[hash] = fiatTotal_;
    localCurrency[hash] = localCurrency_;
    tokenTotal[hash] = tokenTotal_;
    liquidationLimitPercentage[hash] = liquidationLimitPercentage_;
    state[hash] = LoanState.CREATED;

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function cancelLoan(bytes32 hash) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.CREATED, "Invalid loan state");

    state[hash] = LoanState.CANCELLED;

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function acceptLoan(bytes32 hash) external {
    require(beneficiary[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.CREATED, "Invalid loan state");

    collateral[hash].transferFrom(msg.sender, address(this), tokenTotal[hash]);

    state[hash] = LoanState.COLLATERALIZED;

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function activateLoan(bytes32 hash) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(state[hash] == LoanState.COLLATERALIZED, "Invalid state");

    state[hash] = LoanState.ACTIVE;
    dueTimestamp[hash] = block.timestamp + dueSeconds[hash];

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function computeBaseInterest(bytes32 hash, uint256 atTimestamp) public view returns(uint256) {
    require(state[hash] == LoanState.ACTIVE, "Invalid state");
    uint256 dueMargin = dueSeconds[hash];
    if (atTimestamp <  dueTimestamp[hash]) {
      dueMargin = dueMargin - (dueTimestamp[hash] - atTimestamp);
    }
    return ((fiatTotal[hash] * interest[hash]) / PERCENT_DECIMAL) * dueMargin / 365 days;
  }

  function computeEarlyInterest(bytes32 hash, uint256 atTimestamp) public view returns(uint256) {
    require(state[hash] == LoanState.ACTIVE, "Invalid state");
    if (dueTimestamp[hash] < atTimestamp) {
      return 0;
    }
    return ((fiatTotal[hash] * earlyInterest[hash]) / PERCENT_DECIMAL) * (dueTimestamp[hash] - atTimestamp) / 365 days;
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

    uint256 tokensForLender = ((fiatTotal[hash] + fee) * PERCENT_DECIMAL) / tokenPrice;
    require(tokenTotal[hash] > tokensForLender, "Loan dafualted");
    uint256 tokensForBeneficiary = tokenTotal[hash] - tokensForLender;

    require(
      collateral[hash].transfer(lender[hash], tokensForLender)
      &&
      collateral[hash].transfer(beneficiary[hash], tokensForBeneficiary)
    ,"Can not transfer");

    emit LoanStatusUpdate(hash, state[hash]);
  }

  function paidInToken(bytes32 hash, uint256 tokenPrice, uint256 priceExpiry, bytes memory bankSignature) external {
    require(beneficiary[hash] == msg.sender, "Invalid sender");
    require(priceExpiry >= block.timestamp, "Price expired");

    bytes32 priceHash = keccak256(abi.encode(tokenPrice, priceExpiry));
    require(priceHash.recover(bankSignature) == lender[hash], "Invalid signature");
    _paidInToken(hash, tokenPrice);
  }


  function executeDueLoan(bytes32 hash, uint256 tokenPrice) external {
    require(lender[hash] == msg.sender, "Invalid sender");
    require(dueTimestamp[hash] > block.timestamp, "Loan not due");

    _paidInToken(hash, tokenPrice);
  }

}
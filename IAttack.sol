pragma solidity =0.8.7;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
interface IAttack {

    function bondForRebalance() external;
    
    function auctionBonder() external view returns (address);

    
}
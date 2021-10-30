const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace contract", () => {
  let owner
  let addr1
  let addr2
  let addrs
  let SampleERC721
  let sampleERC721
  let SampleERC20
  let sampleERC20
  let Marketplace
  let marketplace

  before(async () => {
    SampleERC721 = await ethers.getContractFactory('SampleERC721');
    SampleERC20 = await ethers.getContractFactory('Dai');
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners()
    sampleERC721 = await SampleERC721.deploy("CryptoLizards", "CLIZ")
    await sampleERC721.deployed()
    sampleERC20 = await SampleERC20.deploy(0);
    await sampleERC20.deployed()
    Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy("10")
    await marketplace.deployed()
  });

  describe("Deployment", () => {
    it("Should return the sample NFT with the correct name and symbol", async () => {
      expect(await sampleERC721.name()).to.equal("CryptoLizards")
      expect(await sampleERC721.symbol()).to.equal("CLIZ")
    })
    it("Should return the marketplace with the correct curation fee", async () => {
      expect(await marketplace.getCurationFee()).to.equal("10")
    })
  })

  describe("Mint & List NFT", () => {
    it("Should mint a sample NFT to the owner", async () => {
      const res = await sampleERC721.mintToken(owner.address, 1, {from: owner.address})
      expect(await sampleERC721.ownerOf(1)).to.equal(owner.address)
    })
    it("Should made the owner set the NFT approved for the marketplace", async () => {
      const res3 = await sampleERC721.setApprovalForAll(marketplace.address, true, {from: owner.address})
      expect(await sampleERC721.isApprovedForAll(owner.address, marketplace.address)).to.equal(true)
    })
    it("Should list the NFT on the marketplace and emit NFTListed event", async () => {
      const tx = await marketplace.listNFT(sampleERC721.address, 1, "test", 1000000)
      let receipt = await tx.wait();
      expect(receipt.events).to.not.equal([])
      const res = receipt.events?.filter((x) => {
        return x.event == "NFTListed"
      });
      expect(res[0].event).to.equal("NFTListed")
    })
  })

  describe("Buy NFT", () => {
    it("Should transfer the NFT and emit NFTBought event", async () => {
      await sampleERC721.mintToken(owner.address, 2, {from: owner.address});
      const res = await sampleERC721.setApprovalForAll(marketplace.address, true, {from: owner.address})
      await marketplace.listNFT(sampleERC721.address, 2, "test", 1000000);
      const tx =await marketplace.connect(addr1).buyNFT(2,{from: addr1.address, value:1000000});
      let receipt = await tx.wait();
      expect(receipt.events).to.not.equal([])
      const res2 = receipt.events?.filter((x) => {
        return x.event == "NFTBought"
      });
      expect(res2[0].event).to.equal("NFTBought")
      expect(addr1.address).to.equal(receipt.events[2].args[4])
    })
    it("Should send the money to the seller", async () => {
      await sampleERC721.mintToken(owner.address, 3, {from: owner.address});
      const res = await sampleERC721.setApprovalForAll(marketplace.address, true, {from: owner.address})
      const balance = await ethers.provider.getBalance(owner.address);
      await marketplace.listNFT(sampleERC721.address, 3, "test", 1000000000000000);
      const tx =await marketplace.connect(addr1).buyNFT(3,{from: addr1.address,value:1000000000000000});
      const balance2 = await ethers.provider.getBalance(owner.address);
      expect(balance2).to.be.above(balance)     
    })
  })

  describe("Mint & Distribution of DAI", async () => {
    it("Should Mint ERC20 tokens successfully", async () => {
      await sampleERC20.mint(owner.address, 10, {from: owner.address})
      expect(await sampleERC20.balanceOf(owner.address)).to.equal(10)
      await sampleERC20.mint(addr1.address, 20, {from: owner.address})
      expect(await sampleERC20.balanceOf(addr1.address)).to.equal(20)
      await sampleERC20.mint(addr2.address, 30, {from: owner.address})
      expect(await sampleERC20.balanceOf(addr2.address)).to.equal(30)
    })
    it("Should approve the marketplace to move owner's and other addresses DAI tokens", async () => {
      await sampleERC20.approve(marketplace.address, 999999999999, {from: owner.address})
      expect(await sampleERC20.allowance(owner.address, marketplace.address)).to.equal(999999999999)
      await sampleERC20.connect(addr1).approve(marketplace.address, 999999999999, {from: addr1.address})
      expect(await sampleERC20.allowance(addr1.address, marketplace.address)).to.equal(999999999999)
      await sampleERC20.connect(addr2).approve(marketplace.address, 999999999999, {from: addr2.address})
      expect(await sampleERC20.allowance(addr2.address, marketplace.address)).to.equal(999999999999)
    })
  })

  describe("Bond ERC20 tokens", () => {
    it("Should let users bond different amount of ERC20s to an NFT", async () => {
      await marketplace.bondNFT(3, 5, sampleERC20.address, {from: owner.address})
      expect(await sampleERC20.balanceOf(owner.address)).to.equal(5)
      await marketplace.connect(addr1).bondNFT(3, 10, sampleERC20.address, {from: addr1.address})
      expect(await sampleERC20.balanceOf(addr1.address)).to.equal(10)
      await marketplace.connect(addr2).bondNFT(3, 15, sampleERC20.address, {from: addr2.address})
      expect(await sampleERC20.balanceOf(addr2.address)).to.equal(15)
      // THIS SHOULD FAIL! OR MAYBE NOT? What if the owner bonds to itself?
    })
  })
})

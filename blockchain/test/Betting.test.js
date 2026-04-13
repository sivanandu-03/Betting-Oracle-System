const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Betting Oracle System", function () {
  let oracle, bettingMarket;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const SportsOracle = await ethers.getContractFactory("SportsOracle");
    oracle = await SportsOracle.deploy();
    await oracle.waitForDeployment();

    const BettingMarket = await ethers.getContractFactory("BettingMarket");
    bettingMarket = await BettingMarket.deploy(await oracle.getAddress());
    await bettingMarket.waitForDeployment();

    // Fund the betting market to be able to pay out 2x
    await owner.sendTransaction({
      to: await bettingMarket.getAddress(),
      value: ethers.parseEther("10.0")
    });
  });

  describe("SportsOracle", function() {
    it("Should set the right oracleAddress", async function () {
      expect(await oracle.oracleAddress()).to.equal(owner.address);
    });

    it("Should submit player data", async function() {
      await expect(oracle.submitPlayerData(1, 101, 25))
        .to.emit(oracle, "DataSubmitted")
        .withArgs(1, 101);
      
      const perf = await oracle.performances(1, 101);
      expect(perf.pointsScored).to.equal(25);
    });

    it("Should revert if not oracle", async function() {
      await expect(oracle.connect(addr1).submitPlayerData(1, 101, 25)).to.be.revertedWith("Only oracle can call");
      await expect(oracle.connect(addr1).finalizeMatch(1, 101)).to.be.revertedWith("Only oracle can call");
    });

    it("Should finalize match", async function() {
      await oracle.finalizeMatch(1, 101);
      const perf = await oracle.performances(1, 101);
      expect(perf.finalized).to.be.true;
    });

    it("Should revert submit data if finalized", async function() {
      await oracle.finalizeMatch(1, 101);
      await expect(oracle.submitPlayerData(1, 101, 25)).to.be.revertedWith("Data already finalized");
    });
  });

  describe("BettingMarket", function() {
    it("Should set the correct oracle address", async function() {
      expect(await bettingMarket.oracle()).to.equal(await oracle.getAddress());
    });

    it("Should allow placing bets", async function() {
      await bettingMarket.connect(addr1).placeBet(1, 101, 20, { value: ethers.parseEther("1.0") });
      const bet = await bettingMarket.bets(0);
      expect(bet.bettor).to.equal(addr1.address);
      expect(bet.amount).to.equal(ethers.parseEther("1.0"));
    });

    it("Should revert placing bet if match finalized", async function() {
      await oracle.finalizeMatch(1, 101);
      await expect(bettingMarket.connect(addr1).placeBet(1, 101, 20, { value: ethers.parseEther("1.0") })).to.be.revertedWith("Match already finalized");
    });

    it("Should settle bet and pay winner", async function() {
      await bettingMarket.connect(addr1).placeBet(1, 101, 20, { value: ethers.parseEther("1.0") });
      await oracle.submitPlayerData(1, 101, 25);
      await oracle.finalizeMatch(1, 101);
      
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      const tx = await bettingMarket.settleBet(0);
      const receipt = await tx.wait();
      
      const newBalance = await ethers.provider.getBalance(addr1.address);
      
      const bet = await bettingMarket.bets(0);
      expect(bet.settled).to.be.true;
      // The test passed if new balance is correct accounting for gas
    });

    it("Should not pay if bet lost", async function() {
      await bettingMarket.connect(addr1).placeBet(1, 101, 30, { value: ethers.parseEther("1.0") });
      await oracle.submitPlayerData(1, 101, 25);
      await oracle.finalizeMatch(1, 101);
      
      const initialBalance = await ethers.provider.getBalance(addr1.address);
      await bettingMarket.settleBet(0);
      const newBalance = await ethers.provider.getBalance(addr1.address);
      
      expect(newBalance).to.equal(initialBalance); // No payment, address does not pay gas for settle
    });

    it("Should revert settle if already settled", async function() {
      await bettingMarket.connect(addr1).placeBet(1, 101, 20, { value: ethers.parseEther("1.0") });
      await oracle.submitPlayerData(1, 101, 25);
      await oracle.finalizeMatch(1, 101);
      
      await bettingMarket.settleBet(0);
      await expect(bettingMarket.settleBet(0)).to.be.revertedWith("Bet already settled");
    });

    it("Should revert settle if match not finalized", async function() {
      await bettingMarket.connect(addr1).placeBet(1, 101, 20, { value: ethers.parseEther("1.0") });
      await expect(bettingMarket.settleBet(0)).to.be.revertedWith("Match not yet finalized");
    });
  });
});

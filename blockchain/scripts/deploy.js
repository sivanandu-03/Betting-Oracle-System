const hre = require("hardhat");

async function main() {
  const SportsOracle = await hre.ethers.getContractFactory("SportsOracle");
  const oracle = await SportsOracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("SportsOracle deployed to:", oracleAddress);

  const BettingMarket = await hre.ethers.getContractFactory("BettingMarket");
  const bettingMarket = await BettingMarket.deploy(oracleAddress);
  await bettingMarket.waitForDeployment();
  console.log("BettingMarket deployed to:", await bettingMarket.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

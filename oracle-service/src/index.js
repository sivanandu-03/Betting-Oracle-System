const express = require('express');
const { ethers } = require('ethers');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3001;

// Basic healthcheck
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const CONTRACT_ADDRESS = process.env.ORACLE_CONTRACT_ADDRESS;

let oracleContract;

const SPORTS_ORACLE_ABI = [
  "function submitPlayerData(uint256 matchId, uint256 playerId, uint256 pointsScored) external",
  "function finalizeMatch(uint256 matchId, uint256 playerId) external",
  "function oracleAddress() view returns (address)"
];

async function initialize() {
    try {
        if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
            console.warn("WARNING: Missing ORACLE_PRIVATE_KEY or ORACLE_CONTRACT_ADDRESS");
            return;
        }
        
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        oracleContract = new ethers.Contract(CONTRACT_ADDRESS, SPORTS_ORACLE_ABI, wallet);
        
        console.log(`Oracle initialized with address: ${wallet.address}`);
    } catch (err) {
        console.error("Initialization failed:", err);
    }
}

app.post('/api/trigger-update', async (req, res) => {
    if (!oracleContract) return res.status(500).json({ error: "Oracle not configured properly" });

    const { matchId, playerId, pointsScored } = req.body;
    
    try {
        console.log(`Submitting data: matchId=${matchId}, playerId=${playerId}, pointsScored=${pointsScored}`);
        const tx = await oracleContract.submitPlayerData(matchId, playerId, pointsScored);
        const receipt = await tx.wait();
        
        res.status(200).json({ 
            success: true, 
            transactionHash: tx.hash 
        });
    } catch (error) {
        console.error("Error submitting data:", error);
        res.status(500).json({ error: "Transaction failed", message: error.message });
    }
});

app.post('/api/trigger-finalize', async (req, res) => {
    if (!oracleContract) return res.status(500).json({ error: "Oracle not configured properly" });

    const { matchId, playerId } = req.body;
    
    try {
        console.log(`Finalizing match: matchId=${matchId}, playerId=${playerId}`);
        const tx = await oracleContract.finalizeMatch(matchId, playerId);
        const receipt = await tx.wait();
        
        res.status(200).json({ 
            success: true, 
            transactionHash: tx.hash 
        });
    } catch (error) {
        console.error("Error finalizing match:", error);
        res.status(500).json({ error: "Transaction failed", message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Oracle service running on port ${port}`);
    initialize();
});

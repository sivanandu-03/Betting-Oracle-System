// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SportsOracle.sol";

contract BettingMarket {
    ISportsOracle public oracle;

    struct Bet {
        address bettor;
        uint256 amount;
        bool settled;
        uint256 matchId;
        uint256 playerId;
        uint256 predictedValue;
    }

    Bet[] public bets;

    constructor(address oracleAddress) {
        oracle = ISportsOracle(oracleAddress);
    }

    receive() external payable {}

    function placeBet(uint256 matchId, uint256 playerId, uint256 predictedValue) external payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        (, bool finalized) = oracle.performances(matchId, playerId);
        require(!finalized, "Match already finalized");

        bets.push(Bet({
            bettor: msg.sender,
            amount: msg.value,
            settled: false,
            matchId: matchId,
            playerId: playerId,
            predictedValue: predictedValue
        }));
    }

    function settleBet(uint256 betId) external {
        require(betId < bets.length, "Invalid bet ID");
        Bet storage bet = bets[betId];
        require(!bet.settled, "Bet already settled");

        (uint256 pointsScored, bool finalized) = oracle.performances(bet.matchId, bet.playerId);
        require(finalized, "Match not yet finalized");

        bet.settled = true;

        if (pointsScored > bet.predictedValue) {
            uint256 payout = bet.amount * 2;
            payable(bet.bettor).transfer(payout);
        }
    }
}

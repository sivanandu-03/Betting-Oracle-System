// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ISportsOracle {
    function oracleAddress() external view returns (address);
    function performances(uint256 matchId, uint256 playerId) external view returns (uint256 pointsScored, bool finalized);
    function submitPlayerData(uint256 matchId, uint256 playerId, uint256 pointsScored) external;
    function finalizeMatch(uint256 matchId, uint256 playerId) external;
}

contract SportsOracle is ISportsOracle {
    address public override oracleAddress;

    struct PlayerPerformance {
        uint256 pointsScored;
        bool finalized;
    }

    // matchId => playerId => PlayerPerformance
    mapping(uint256 => mapping(uint256 => PlayerPerformance)) public override performances;

    event DataSubmitted(uint256 indexed matchId, uint256 indexed playerId);
    event DataFinalized(uint256 indexed matchId, uint256 indexed playerId);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only oracle can call");
        _;
    }

    constructor() {
        oracleAddress = msg.sender;
    }

    function submitPlayerData(uint256 matchId, uint256 playerId, uint256 pointsScored) external override onlyOracle {
        require(!performances[matchId][playerId].finalized, "Data already finalized");
        performances[matchId][playerId].pointsScored = pointsScored;
        emit DataSubmitted(matchId, playerId);
    }

    function finalizeMatch(uint256 matchId, uint256 playerId) external override onlyOracle {
        performances[matchId][playerId].finalized = true;
        emit DataFinalized(matchId, playerId);
    }
}

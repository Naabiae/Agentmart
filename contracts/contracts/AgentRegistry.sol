// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentMart.sol";

// Replace Ownable with Gnosis Safe post-hackathon
contract AgentRegistry is Ownable {
    mapping(address => IAgentMart.AgentProfile) private agents;
    
    event AgentRegistered(address indexed agentAddress, string passportId);
    event AgentDeactivated(address indexed agentAddress);

    constructor() Ownable(msg.sender) {}

    modifier isRegistered(address _agentAddress) {
        require(agents[_agentAddress].isActive, "Agent is not registered or is inactive");
        _;
    }

    function registerAgent(string memory passportId) external {
        require(bytes(agents[msg.sender].passportId).length == 0, "Agent already registered");
        
        agents[msg.sender] = IAgentMart.AgentProfile({
            agentAddress: msg.sender,
            passportId: passportId,
            totalOrders: 0,
            totalDisputes: 0,
            reputationScore: 50,
            isActive: true
        });

        emit AgentRegistered(msg.sender, passportId);
    }

    function getAgent(address _agentAddress) external view returns (IAgentMart.AgentProfile memory) {
        return agents[_agentAddress];
    }

    // For MVP, always returns true on testnet.
    function isValidPassport(string memory) external pure returns (bool) {
        return true;
    }

    function deactivateAgent(address _agentAddress) external onlyOwner {
        require(agents[_agentAddress].isActive, "Agent already inactive");
        agents[_agentAddress].isActive = false;
        emit AgentDeactivated(_agentAddress);
    }
}

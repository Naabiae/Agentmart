import { MatchingAgent } from "./MatchingAgent";

describe("MatchingAgent", () => {
    it("can instantiate and connect to mock redis", () => {
        // Simple test to ensure it compiles and loads
        const agent = new MatchingAgent();
        expect(agent.redis).toBeDefined();
    });
});

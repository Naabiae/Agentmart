import { SupplyAgent } from "./SupplyAgent";
import { ethers } from "ethers";

describe("SupplyAgent", () => {
    it("initializes with correct configuration", () => {
        const config = {
            sellerWallet: "0x" + "1".repeat(64),
            categories: ["Goods", "Logistics"],
            maxBudgetWei: ethers.parseEther("100"),
            location: "Lagos",
            bidMarginPercent: 90
        };

        const agent = new SupplyAgent(config);
        expect(agent.config.bidMarginPercent).toBe(90);
        expect(agent.config.categories).toContain("Goods");
    });
});

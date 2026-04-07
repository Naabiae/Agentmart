import crypto from "crypto";
import { RampAgent } from "./RampAgent";

describe("RampAgent", () => {
    let agent: RampAgent;

    beforeEach(() => {
        agent = new RampAgent();
    });

    it("loads API keys and returns provider with better net rate via parallel fetching", async () => {
        expect(agent.moonpayApiKey).toBeDefined();
        expect(agent.transakApiKey).toBeDefined();

        const quote = await agent.getOnrampQuote(100, "USD", "USDC");
        expect(quote.provider).toBe("MoonPay");
        expect(quote.quote.netCryptoAmount).toBe(100 * 0.99 - 0.5); // Moonpay logic
    });

    it("verifies incoming MoonPay webhook HMAC signature correctly", () => {
        const payload = JSON.stringify({ type: "transaction_completed", data: { id: "123" } });
        const secret = "secret_key";
        const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
        
        expect(agent.verifyMoonpaySignature(payload, signature, secret)).toBe(true);
        expect(agent.verifyMoonpaySignature(payload, "invalid_sig", secret)).toBe(false);
    });
});
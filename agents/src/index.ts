import express from "express";
import cors from "cors";
import { DemandAgent } from "./agents/DemandAgent";
import { RampAgent } from "./agents/RampAgent";
import { SupplyAgent } from "./agents/SupplyAgent";
import { MatchingAgent } from "./agents/MatchingAgent";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const demandAgent = new DemandAgent();
const rampAgent = new RampAgent();
const matchingAgent = new MatchingAgent();

// Start background agents
matchingAgent.start();

const sellerWallet = process.env.SELLER_WALLET || process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const supplyAgent = new SupplyAgent({
    sellerWallet,
    categories: ["Goods", "Services", "Digital", "Logistics", "Other"],
    maxBudgetWei: BigInt("1000000000000000000000"), // 1000 KITE/USDC
    location: "Global",
    bidMarginPercent: 90
});
supplyAgent.start();

// API Routes
app.post("/api/parse-order", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: "Missing prompt" });
        
        const spec = await demandAgent.parseRequest(prompt);
        res.json(spec);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get("/api/bids/:orderId", async (req, res) => {
    try {
        const { orderId } = req.params;
        const bidsData = await matchingAgent.redis.get(`order_bids:${orderId}`);
        if (!bidsData) return res.json([]);
        res.json(JSON.parse(bidsData));
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// SSE endpoint
const clients: Record<string, express.Response[]> = {};

app.get("/api/events/:clientId", (req, res) => {
    const { clientId } = req.params;
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    
    if (!clients[clientId]) clients[clientId] = [];
    clients[clientId].push(res);

    req.on("close", () => {
        clients[clientId] = clients[clientId].filter(c => c !== res);
    });
});

// Webhook endpoint
app.post("/api/ramp/webhook", express.raw({ type: "application/json" }), (req, res) => {
    const signature = req.headers["moonpay-signature-v2"] as string;
    const secret = process.env.MOONPAY_WEBHOOK_SECRET || "secret_key";
    
    const rawBody = req.body.toString("utf8");
    if (!rampAgent.verifyMoonpaySignature(rawBody, signature, secret)) {
        return res.status(401).json({ error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody);
    if (payload.type === "transaction_completed") {
        // Emit SSE to client
        const clientId = payload.data.externalCustomerId; // Used as clientId
        if (clients[clientId]) {
            clients[clientId].forEach(c => c.write(`data: ${JSON.stringify({ status: "completed", amount: payload.data.quoteCurrencyAmount })}\n\n`));
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`AgentMart Backend running on port ${PORT}`);
});

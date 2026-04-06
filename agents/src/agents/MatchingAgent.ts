import { getContracts } from "../chain/contracts";
import Redis from "ioredis";

export class MatchingAgent {
    redis: Redis;
    private isRunning = false;

    constructor() {
        this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log(`[MatchingAgent] Started listening to BidPlaced...`);
        
        const contracts = getContracts();
        contracts.BidEngine.on("BidPlaced", async (orderId, bidId, seller, priceWei, estimatedDelivery) => {
            await this.scoreBids(orderId);
        });
    }

    stop() {
        this.isRunning = false;
        const contracts = getContracts();
        contracts.BidEngine.removeAllListeners("BidPlaced");
        console.log(`[MatchingAgent] Stopped.`);
    }

    private async scoreBids(orderId: string) {
        const contracts = getContracts();
        const bids = await contracts.BidEngine.getBidsForOrder(orderId);
        
        if (bids.length === 0) return;

        // Find max/min for normalization
        let maxPrice = bids[0].priceWei;
        let minPrice = bids[0].priceWei;
        let maxEta = bids[0].estimatedDelivery;
        let minEta = bids[0].estimatedDelivery;
        let maxRep = bids[0].reputationScore || 1;

        for (const bid of bids) {
            if (bid.priceWei > maxPrice) maxPrice = bid.priceWei;
            if (bid.priceWei < minPrice) minPrice = bid.priceWei;
            if (bid.estimatedDelivery > maxEta) maxEta = bid.estimatedDelivery;
            if (bid.estimatedDelivery < minEta) minEta = bid.estimatedDelivery;
            if (bid.reputationScore > maxRep) maxRep = bid.reputationScore;
        }

        const scoredBids = bids.map((bid: any) => {
            const priceScore = maxPrice === minPrice ? 1 : 1 - Number((bid.priceWei - minPrice)) / Number(maxPrice - minPrice);
            const etaScore = maxEta === minEta ? 1 : 1 - Number((bid.estimatedDelivery - minEta)) / Number(maxEta - minEta);
            const repScore = Number(bid.reputationScore) / Number(maxRep);

            const score = (0.5 * priceScore) + (0.3 * etaScore) + (0.2 * repScore);
            return { ...bid, score };
        });

        scoredBids.sort((a: any, b: any) => b.score - a.score);
        
        await this.redis.set(`order_bids:${orderId}`, JSON.stringify(scoredBids));
        console.log(`[MatchingAgent] Scored and ranked bids for order ${orderId}`);
    }
}

import { ethers } from "ethers";
import { getContracts, getWallet } from "../chain/contracts";

export interface SupplyConfig {
    sellerWallet: string;
    categories: string[];
    maxBudgetWei: bigint;
    location: string;
    bidMarginPercent: number; // 90 = 90% of buyer budget
    pollingIntervalMs?: number;
}

export class SupplyAgent {
    config: SupplyConfig;
    intervalId?: NodeJS.Timeout;
    private isRunning = false;

    constructor(config: SupplyConfig) {
        this.config = config;
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log(`[SupplyAgent] Started for wallet ${this.config.sellerWallet.slice(0,6)}...`);
        
        const contracts = getContracts(getWallet(this.config.sellerWallet));
        
        // Listen via events
        contracts.OrderBook.on("OrderCreated", async (orderId, buyer, desc, budget, deadline) => {
            console.log(`[SupplyAgent] Event: OrderCreated ${orderId}`);
            await this.evaluateOrder(orderId, contracts);
        });

        // Fallback polling
        this.intervalId = setInterval(async () => {
            try {
                await this.poll(contracts);
            } catch (e) {
                console.error(`[SupplyAgent] Polling error:`, e);
            }
        }, this.config.pollingIntervalMs || 30000);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        
        const contracts = getContracts();
        contracts.OrderBook.removeAllListeners("OrderCreated");
        console.log(`[SupplyAgent] Stopped.`);
    }

    private async poll(contracts: any) {
        console.log(`[SupplyAgent] Polling for open orders...`);
        const orders = await contracts.OrderBook.getOpenOrders(0, 20);
        for (const order of orders) {
            await this.evaluateOrder(order.orderId, contracts);
        }
    }

    private async evaluateOrder(orderId: string, contracts: any) {
        const order = await contracts.OrderBook.getOrder(orderId);
        
        // Category check (enums are returned as numbers)
        const categoryMap = ["Goods", "Services", "Digital", "Logistics", "Other"];
        const categoryStr = categoryMap[Number(order.category)];
        
        if (!this.config.categories.includes(categoryStr)) return;
        if (order.budgetWei > this.config.maxBudgetWei) return;

        // Check if already bid
        const existingBids = await contracts.BidEngine.getBidsForOrder(orderId);
        const myWallet = getWallet(this.config.sellerWallet).address;
        const alreadyBid = existingBids.some((b: any) => b.seller === myWallet);
        
        if (alreadyBid) return;

        // Compute bid parameters
        const bidPrice = (order.budgetWei * BigInt(this.config.bidMarginPercent)) / 100n;
        const eta = Math.floor(Date.now() / 1000) + 48 * 3600; // +48 hours

        console.log(`[SupplyAgent] Placing bid on ${orderId} for ${ethers.formatEther(bidPrice)} KITE`);
        
        try {
            const tx = await contracts.BidEngine.placeBid(orderId, bidPrice, eta);
            await tx.wait();
            console.log(`[SupplyAgent] Bid placed successfully!`);
        } catch (e) {
            console.error(`[SupplyAgent] Error placing bid:`, e);
        }
    }
}

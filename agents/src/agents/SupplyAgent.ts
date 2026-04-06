import { ethers } from "ethers";
import { getContracts, getWallet } from "../chain/contracts";
import * as fs from "fs";

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
    private logFile = "supply-agent.log";

    constructor(config: SupplyConfig) {
        this.config = config;
    }

    private log(action: string, data: any) {
        const entry = {
            timestamp: new Date().toISOString(),
            wallet: this.config.sellerWallet.slice(0, 8),
            action,
            ...data
        };
        fs.appendFileSync(this.logFile, JSON.stringify(entry) + "\n");
        console.log(`[SupplyAgent] ${action}`, data);
    }

    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.log("STARTED", { config: { ...this.config, maxBudgetWei: this.config.maxBudgetWei.toString() } });
        
        const contracts = getContracts(getWallet(this.config.sellerWallet));
        
        // Listen via events
        contracts.OrderBook.on("OrderCreated", async (orderId, buyer, desc, budget, deadline) => {
            this.log("EVENT_RECEIVED", { event: "OrderCreated", orderId });
            await this.evaluateOrderWithRetry(orderId, contracts, 3);
        });

        // Fallback polling
        this.intervalId = setInterval(async () => {
            try {
                await this.poll(contracts);
            } catch (e: any) {
                this.log("POLLING_ERROR", { error: e.message });
            }
        }, this.config.pollingIntervalMs || 30000);
    }

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.isRunning = false;
        
        const contracts = getContracts();
        contracts.OrderBook.removeAllListeners("OrderCreated");
        this.log("STOPPED", {});
    }

    private async poll(contracts: any) {
        this.log("POLLING_START", {});
        const orders = await contracts.OrderBook.getOpenOrders(0, 20);
        for (const order of orders) {
            await this.evaluateOrderWithRetry(order.orderId, contracts, 1);
        }
        this.log("POLLING_END", { count: orders.length });
    }

    /**
     * Document retry logic for missed events:
     * If an evaluation or tx submission fails due to network issues,
     * it will retry up to maxRetries times with an exponential backoff.
     */
    private async evaluateOrderWithRetry(orderId: string, contracts: any, maxRetries: number) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.evaluateOrder(orderId, contracts);
                break; // Success, exit retry loop
            } catch (e: any) {
                this.log("EVALUATE_RETRY", { orderId, attempt, error: e.message });
                if (attempt === maxRetries) {
                    this.log("EVALUATE_FAILED", { orderId, error: e.message });
                } else {
                    // Wait before retry
                    await new Promise(res => setTimeout(res, attempt * 2000));
                }
            }
        }
    }

    private async evaluateOrder(orderId: string, contracts: any) {
        const order = await contracts.OrderBook.getOrder(orderId);
        
        // Category check (enums are returned as numbers)
        const categoryMap = ["Goods", "Services", "Digital", "Logistics", "Other"];
        const categoryStr = categoryMap[Number(order.category)];
        
        if (!this.config.categories.includes(categoryStr)) {
            this.log("ORDER_IGNORED", { orderId, reason: "Category mismatch", category: categoryStr });
            return;
        }
        
        if (order.budgetWei > this.config.maxBudgetWei) {
            this.log("ORDER_IGNORED", { orderId, reason: "Budget exceeds max", budget: order.budgetWei.toString() });
            return;
        }

        // Check if already bid
        const existingBids = await contracts.BidEngine.getBidsForOrder(orderId);
        const myWallet = getWallet(this.config.sellerWallet).address;
        const alreadyBid = existingBids.some((b: any) => b.seller === myWallet);
        
        if (alreadyBid) {
            this.log("ORDER_IGNORED", { orderId, reason: "Already bid" });
            return;
        }

        // Compute bid parameters
        const bidPrice = (order.budgetWei * BigInt(this.config.bidMarginPercent)) / 100n;
        const eta = Math.floor(Date.now() / 1000) + 48 * 3600; // +48 hours

        this.log("PLACING_BID", { orderId, bidPrice: bidPrice.toString(), eta });
        
        const tx = await contracts.BidEngine.placeBid(orderId, bidPrice, eta);
        await tx.wait();
        
        this.log("BID_PLACED_SUCCESS", { orderId, txHash: tx.hash });
    }
}

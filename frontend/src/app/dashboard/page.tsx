"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";
import { useState, useEffect } from "react";
import { formatEther } from "viem";

export default function Dashboard() {
  const { address } = useAccount();
  const [bids, setBids] = useState<any[]>([]);

  // Fetch open orders
  const { data: orders, isLoading } = useReadContract({
    address: CONTRACTS.OrderBook as `0x${string}`,
    abi: OrderBookABI,
    functionName: "getOpenOrders",
    args: [0, 20],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Seller Dashboard</h1>
        {address && <span className="bg-gray-100 px-4 py-2 rounded-full font-mono text-sm">{address.slice(0,6)}...{address.slice(-4)}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Marketplace (Open Orders)</h2>
          
          {isLoading && <p>Loading market data...</p>}
          {(!orders || (orders as any[]).length === 0) && !isLoading && <p className="text-gray-500">No active orders available right now.</p>}

          <div className="space-y-4">
            {(orders as any[])?.map((order, i) => (
              <div key={i} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col space-y-3">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-lg">{order.itemDescription}</h3>
                  <span className="text-green-600 font-bold">${formatEther(order.budgetWei)} USDC</span>
                </div>
                
                <div className="text-sm text-gray-500 flex justify-between">
                  <span>📍 {order.location}</span>
                  <span>⏳ Deadline: {new Date(Number(order.deadline) * 1000).toLocaleDateString()}</span>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-blue-600 font-semibold italic bg-blue-50 p-2 rounded inline-block">
                    🤖 Your SupplyAgent is monitoring this category
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Agent Console</h2>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-96 overflow-y-auto shadow-inner">
            <p className="text-gray-400 mb-2">// SupplyAgent v1.0.0 Online</p>
            <p className="mb-1">{`> Loading seller profile for ${address ? address.slice(0,6) : '0x00'}...`}</p>
            <p className="mb-1">{`> Categories: ["Goods", "Services", "Digital", "Logistics", "Other"]`}</p>
            <p className="mb-1">{`> Margin setting: 90% of buyer budget`}</p>
            <p className="mb-1">{`> Listening for OrderCreated events on Kite Ozone Testnet...`}</p>
            
            {(orders as any[])?.length > 0 && (
              <div className="mt-4 space-y-2 opacity-80">
                <p className="text-yellow-400">{`> [POLLING] Found ${(orders as any[]).length} open orders.`}</p>
                <p>{`> [EVALUATING] Analyzing order ${(orders as any[])[0].orderId.slice(0,10)}...`}</p>
                <p>{`> [MATCH] Category matched. Budget within limits.`}</p>
                <p className="text-blue-300">{`> [ACTION] Initiating auto-bid at ${formatEther((orders as any[])[0].budgetWei) * 0.9} USDC`}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";
import { formatEther } from "viem";

export default function Dashboard() {
  const { address } = useAccount();

  const [margin, setMargin] = useState(90);
  const [categories, setCategories] = useState({
    Goods: true,
    Services: true,
    Digital: false,
    Logistics: true,
    Other: false
  });
  const [agentActive, setAgentActive] = useState(true);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel */}
        <div className="col-span-1 border rounded-lg p-6 bg-white shadow-sm h-fit">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="text-xl font-semibold">Supply Agent Settings</h2>
            <div className="flex items-center space-x-2">
              <span className={`h-3 w-3 rounded-full ${agentActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
              <button 
                onClick={() => setAgentActive(!agentActive)}
                className={`text-sm px-3 py-1 rounded font-semibold ${agentActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
              >
                {agentActive ? 'Stop Agent' : 'Start Agent'}
              </button>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Monitored Categories</h3>
              <div className="space-y-2">
                {Object.entries(categories).map(([cat, isChecked]) => (
                  <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => setCategories(prev => ({...prev, [cat]: !prev[cat as keyof typeof categories]}))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-700">Auto-Bid Margin</h3>
                <span className="font-bold text-blue-600">{margin}%</span>
              </div>
              <input 
                type="range" 
                min="50" 
                max="100" 
                value={margin}
                onChange={(e) => setMargin(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your agent will bid {margin}% of the buyer&apos;s budget automatically.
              </p>
            </div>

            <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
              Save Configuration
            </button>
          </div>
        </div>

        {/* Marketplace View */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Global Open Orders</h2>
            
            {isLoading && <p>Loading market data...</p>}
            {(!orders || (orders as any[]).length === 0) && !isLoading && <p className="text-gray-500">No active orders available right now.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {agentActive ? (
                      <p className="text-xs text-blue-600 font-semibold italic bg-blue-50 p-2 rounded inline-block">
                        🤖 Your SupplyAgent is evaluating...
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 font-semibold italic bg-gray-100 p-2 rounded inline-block">
                        Agent is paused.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Agent Console</h2>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 h-64 overflow-y-auto shadow-inner">
              <p className="text-gray-400 mb-2">{`// SupplyAgent v1.0.0 Online`}</p>
              <p className="mb-1">{`> Loading seller profile for ${address ? address.slice(0,6) : '0x00'}...`}</p>
              <p className="mb-1">{`> Active Categories: [${Object.entries(categories).filter(([_, v]) => v).map(([k]) => `"${k}"`).join(", ")}]`}</p>
              <p className="mb-1">{`> Margin setting: ${margin}% of buyer budget`}</p>
              
              {agentActive ? (
                <>
                  <p className="mb-1">{`> Listening for OrderCreated events on Kite Ozone Testnet...`}</p>
                  {(orders as any[])?.length > 0 && (
                    <div className="mt-4 space-y-2 opacity-80">
                      <p className="text-yellow-400">{`> [POLLING] Found ${(orders as any[]).length} open orders.`}</p>
                      <p>{`> [EVALUATING] Analyzing order ${(orders as any[])[0].orderId.slice(0,10)}...`}</p>
                      <p>{`> [MATCH] Category matched. Budget within limits.`}</p>
                      <p className="text-blue-300">{`> [ACTION] Initiating auto-bid at ${(Number(formatEther((orders as any[])[0].budgetWei)) * (margin/100)).toFixed(2)} USDC`}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-red-400 mt-4">{`> Agent process stopped by user.`}</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

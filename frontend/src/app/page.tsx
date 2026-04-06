"use client";

import { useReadContract } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";
import { formatEther } from "viem";

export default function Home() {
  const { data: orders, isLoading } = useReadContract({
    address: CONTRACTS.OrderBook as `0x${string}`,
    abi: OrderBookABI,
    functionName: "getOpenOrders",
    args: [0, 10],
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Open Requests</h1>
      
      {isLoading && <p>Loading orders...</p>}
      
      {(!orders || (orders as any[]).length === 0) && !isLoading && (
        <div className="bg-gray-100 p-8 text-center rounded-lg">
          <p className="text-gray-500">No open orders at the moment.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(orders as any[])?.map((order, i) => (
          <div key={i} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow bg-white">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                Open
              </span>
              <span className="text-lg font-bold text-green-600">
                ${formatEther(order.budgetWei)} USDC
              </span>
            </div>
            
            <h3 className="text-xl font-semibold mb-2">{order.itemDescription}</h3>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>📍 {order.location}</p>
              <p>⏳ Deadline: {new Date(Number(order.deadline) * 1000).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

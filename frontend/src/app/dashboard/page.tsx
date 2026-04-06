"use client";

import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";

export default function Dashboard() {
  const { address } = useAccount();

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

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">Available Orders</h2>
        
        {isLoading && <p>Loading...</p>}
        {(!orders || (orders as any[]).length === 0) && !isLoading && <p className="text-gray-500">No orders to bid on right now.</p>}

        <div className="space-y-4">
          {(orders as any[])?.map((order, i) => (
            <div key={i} className="flex justify-between items-center p-4 border rounded-lg bg-white shadow-sm">
              <div>
                <h3 className="font-semibold">{order.itemDescription}</h3>
                <p className="text-sm text-gray-500">📍 {order.location}</p>
              </div>
              <div className="text-right">
                <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Place Bid
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

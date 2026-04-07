"use client";

import { useReadContract } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";
import { formatEther } from "viem";
import Link from "next/link";

export default function Home() {
  const { data: orders, isLoading } = useReadContract({
    address: CONTRACTS.OrderBook as `0x${string}`,
    abi: OrderBookABI,
    functionName: "getOpenOrders",
    args: [0, 10],
  });

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-10 mb-10 shadow-lg">
        <h1 className="text-4xl font-bold mb-4">AgentMart</h1>
        <p className="text-xl opacity-90 mb-6 max-w-2xl">
          The demand-first agentic commerce network built on Kite AI. Tell your agent what you need, and the marketplace will fulfill it autonomously via x402 payments.
        </p>
        <div className="space-x-4">
          <Link href="/post" className="bg-white text-blue-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors">
            Post a Request
          </Link>
          <Link href="/dashboard" className="border border-white text-white px-6 py-3 rounded-lg font-bold hover:bg-white hover:text-blue-900 transition-colors">
            Seller Dashboard
          </Link>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">Global Order Book</h2>

      {isLoading && (
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {(!orders || (orders as any[]).length === 0) && !isLoading && (
        <div className="bg-gray-50 border-dashed border-2 p-12 text-center rounded-lg">
          <p className="text-gray-500 mb-4">No active requests found on the network.</p>
          <Link href="/post" className="text-blue-600 font-semibold hover:underline">
            Be the first to post a request →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(orders as any[])?.map((order, i) => (
          <div key={i} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                  Open
                </span>
                <span className="text-lg font-bold text-gray-900">
                  ${formatEther(order.budgetWei)} USDC
                </span>
              </div>

              <h3 className="text-xl font-semibold mb-2 line-clamp-2">{order.itemDescription}</h3>

              <div className="text-sm text-gray-600 space-y-2 mb-4">
                <p className="flex items-center">
                  <span className="mr-2">📍</span> {order.location}
                </p>
                <p className="flex items-center">
                  <span className="mr-2">⏳</span> {new Date(Number(order.deadline) * 1000).toLocaleDateString()}
                </p>
                <p className="flex items-center">
                  <span className="mr-2">🏷️</span> Category {order.category}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t text-xs text-gray-400 font-mono break-all">
              Buyer: {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
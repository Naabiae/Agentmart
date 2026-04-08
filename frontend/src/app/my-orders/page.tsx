"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, OrderBookABI } from "@/config/contracts";
import { formatEther } from "viem";
import { useState, useEffect } from "react";

// Minimal ABI just for the BidEngine acceptBid function
const BidEngineABI = [
  "function acceptBid(bytes32 orderId, bytes32 bidId)"
];

export default function MyOrders() {
  const { address } = useAccount();
  const [bidsByOrder, setBidsByOrder] = useState<Record<string, any[]>>({});

  const { data: orders, isLoading } = useReadContract({
    address: CONTRACTS.OrderBook as `0x${string}`,
    abi: OrderBookABI,
    functionName: "getOpenOrders",
    args: [0, 50],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Filter orders that belong to the connected user
  const myOrders = (orders as any[])?.filter(order => order.buyer.toLowerCase() === address?.toLowerCase()) || [];

  useEffect(() => {
    // Fetch bids for each of the buyer's orders from the backend MatchingAgent
    const fetchBids = async () => {
      const newBids: Record<string, any[]> = {};
      for (const order of myOrders) {
        try {
          const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          const res = await fetch(`${API_BASE_URL}/api/bids/${order.orderId}`);
          const bids = await res.json();
          newBids[order.orderId] = bids || [];
        } catch (e) {
          console.error("Failed to fetch bids for order", order.orderId, e);
        }
      }
      setBidsByOrder(newBids);
    };

    if (myOrders.length > 0) {
      fetchBids();
      // Poll every 5 seconds for new bids
      const interval = setInterval(fetchBids, 5000);
      return () => clearInterval(interval);
    }
  }, [orders, address]);

  const handleAcceptBid = (orderId: string, bidId: string) => {
    writeContract({
      address: CONTRACTS.BidEngine as `0x${string}`,
      abi: BidEngineABI,
      functionName: "acceptBid",
      args: [orderId, bidId],
    });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Posted Orders</h1>
      <p className="text-gray-600 mb-8">
        Review the AI-generated bids from Seller SupplyAgents on your active orders. 
        Our MatchingAgent has automatically scored and ranked them for you based on price, reputation, and delivery time.
      </p>

      {isLoading && <p>Loading your orders...</p>}
      
      {!isLoading && myOrders.length === 0 && (
        <div className="bg-gray-50 p-8 text-center rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">You haven&apos;t posted any orders yet.</p>
          <a href="/post" className="text-blue-600 font-semibold hover:underline">Post a new request →</a>
        </div>
      )}

      <div className="space-y-8">
        {myOrders.map((order, i) => {
          const orderBids = bidsByOrder[order.orderId] || [];
          return (
            <div key={i} className="border rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <h2 className="text-2xl font-semibold">{order.itemDescription}</h2>
                  <p className="text-sm text-gray-500">Budget: ${formatEther(order.budgetWei)} USDC • Deadline: {new Date(Number(order.deadline) * 1000).toLocaleDateString()}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Waiting for Bids
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Incoming AI Bids ({orderBids.length})</h3>
                
                {orderBids.length === 0 ? (
                  <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded">No sellers have bid on this yet. SupplyAgents are evaluating...</p>
                ) : (
                  <div className="space-y-3">
                    {orderBids.map((bid, j) => (
                      <div key={j} className={`flex justify-between items-center p-4 border rounded-lg ${j === 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg text-green-700">${formatEther(bid.priceWei)} USDC</span>
                            {j === 0 && <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded uppercase tracking-wider font-bold">Top Match ✨</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Seller: {bid.seller.slice(0,6)}...{bid.seller.slice(-4)} • 
                            ETA: {new Date(Number(bid.estimatedDelivery) * 1000).toLocaleString()} • 
                            Score: {Number(bid.score).toFixed(2)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleAcceptBid(order.orderId, bid.bidId)}
                          disabled={isPending}
                          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                          {isPending ? 'Accepting...' : 'Accept & Escrow'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {isConfirmed && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
          Bid accepted! Order moved to In Progress.
        </div>
      )}
    </div>
  );
}

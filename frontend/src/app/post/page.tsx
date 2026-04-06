"use client";

import { useState } from "react";
import { parseEther } from "viem";

export default function PostOrder() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedSpec, setParsedSpec] = useState<any>(null);
  const [step, setStep] = useState(1);

  const handleParse = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setParsedSpec(data);
      setStep(2);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSignAndPay = async () => {
    // 1. In a real app, use wagmi useSignTypedData for EIP-712 EIP-3009 transferWithAuthorization
    // 2. Send signature to RampAgent
    // 3. Open Moonpay Widget
    setStep(3);
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">What do you need?</h1>
          <p className="text-gray-600">Tell AgentMart what you want in plain English. Our DemandAgent will structure it for the marketplace.</p>
          <textarea 
            className="w-full p-4 border rounded-lg h-32 focus:ring-2 focus:ring-blue-500"
            placeholder="E.g. I need 3kg of rice delivered to Lagos by next Friday under $15"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            onClick={handleParse}
            disabled={loading || prompt.length < 10}
          >
            {loading ? "Parsing..." : "Parse my request"}
          </button>
        </div>
      )}

      {step === 2 && parsedSpec && (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Confirm your order</h1>
          <div className="bg-gray-50 p-6 rounded-lg space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Item</span>
              <span className="font-semibold">{parsedSpec.itemDescription}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Category</span>
              <span className="font-semibold">{parsedSpec.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Budget</span>
              <span className="font-semibold text-green-600">${parsedSpec.budgetNative} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location</span>
              <span className="font-semibold">{parsedSpec.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deadline</span>
              <span className="font-semibold">In {parsedSpec.deadlineDays} days</span>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button 
              className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"
              onClick={() => setStep(1)}
            >
              Edit Request
            </button>
            <button 
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700"
              onClick={handleSignAndPay}
            >
              Confirm & Proceed to Payment
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-6 py-10 border rounded-lg">
          <h1 className="text-2xl font-bold">Complete Payment via MoonPay</h1>
          <p className="text-gray-600">Please complete the fiat transaction. The RampAgent will automatically execute the gasless on-chain transaction once funds land.</p>
          <div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg m-6">
            <span className="text-gray-400 font-mono">[ MoonPay Widget Sandbox Iframe ]</span>
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg" onClick={() => window.location.href = '/'}>
            Simulate Webhook Success
          </button>
        </div>
      )}
    </div>
  );
}

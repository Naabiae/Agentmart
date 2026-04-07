"use client";

import { useState, useEffect } from "react";
import { parseEther } from "viem";
import { useAccount, useSignTypedData } from "wagmi";
import { CONTRACTS } from "@/config/contracts";

export default function PostOrder() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedSpec, setParsedSpec] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [sseStatus, setSseStatus] = useState<string>("");

  const handleParse = async () => {
    if (!prompt) return;
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
    if (!address || !parsedSpec) {
      alert("Please connect your wallet first.");
      return;
    }

    setLoading(true);
    try {
      const budgetWei = parseEther(parsedSpec.budgetNative.toString()).toString();
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 86400; // 24h from now
      const nonce = "0x" + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex");

      // EIP-3009 transferWithAuthorization typed data
      const domain = {
        name: "Mock USDC", // Must match your mock or real stablecoin domain
        version: "1",
        chainId: 31337, // Local testnet chain ID or Kite's 2368
        verifyingContract: CONTRACTS.USDC as `0x${string}`,
      };

      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      const message = {
        from: address,
        to: CONTRACTS.OrderBook as `0x${string}`,
        value: BigInt(budgetWei),
        validAfter: BigInt(validAfter),
        validBefore: BigInt(validBefore),
        nonce: nonce as `0x${string}`,
      };

      // Request EIP-712 signature from the user's wallet
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "TransferWithAuthorization",
        message,
      });

      // Break signature into v, r, s
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      const payload = {
        buyer: address,
        itemDescription: parsedSpec.itemDescription,
        category: parsedSpec.category,
        budgetWei,
        deadlineTimestamp: Math.floor(Date.now() / 1000) + (parsedSpec.deadlineDays * 86400),
        location: parsedSpec.location,
        validAfter,
        validBefore,
        nonce,
        v,
        r,
        s
      };

      // Save signature to backend
      await fetch("http://localhost:4000/api/ramp/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: address, payload }),
      });

      setStep(3);

      // Start listening to SSE for webhook completion
      const evtSource = new EventSource(`http://localhost:4000/api/events/${address}`);
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.status === "completed") {
          setSseStatus(`✅ Payment received! Gasless tx relayed: ${data.txHash}`);
          evtSource.close();
        } else if (data.status === "error") {
          setSseStatus(`❌ Error: ${data.error}`);
          evtSource.close();
        }
      };

    } catch (e) {
      console.error("Signature failed", e);
    }
    setLoading(false);
  };

  const simulateWebhook = async () => {
    // We send a mock payload to the webhook endpoint using the dummy secret
    await fetch("http://localhost:4000/api/ramp/webhook", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "moonpay-signature-v2": "mock_because_we_will_bypass_it_in_dev" // Optional: Update backend to bypass sig in dev
      },
      body: JSON.stringify({
        type: "transaction_completed",
        data: {
          externalCustomerId: address,
          quoteCurrencyAmount: parsedSpec.budgetNative
        }
      })
    });
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
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-3xl font-bold">Confirm your order</h1>
          <div className="bg-gray-50 p-6 rounded-lg space-y-4 border">
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
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
              onClick={handleSignAndPay}
              disabled={loading || !address}
            >
              {loading ? "Signing..." : "Sign (Gasless) & Pay"}
            </button>
          </div>
          {!address && <p className="text-red-500 text-sm">Please connect your wallet using the top right button to proceed.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="text-center space-y-6 py-10 border rounded-lg animate-fade-in">
          <h1 className="text-2xl font-bold">Complete Payment via MoonPay</h1>
          <p className="text-gray-600 px-8">Your gasless signature is saved. Please complete the fiat transaction. The RampAgent will automatically execute the transaction on Kite Ozone once funds land.</p>
          
          <div className="bg-gray-100 h-64 flex flex-col items-center justify-center rounded-lg m-6 border-dashed border-2 border-gray-300">
            <span className="text-gray-500 font-mono mb-4">[ MoonPay Widget Sandbox Iframe ]</span>
            <span className="text-lg font-bold">Pay ${parsedSpec.budgetNative}</span>
          </div>

          <div className="space-y-4">
            {sseStatus ? (
              <div className="p-4 bg-green-100 text-green-800 rounded-lg break-all mx-6 font-mono text-sm">
                {sseStatus}
              </div>
            ) : (
              <div className="flex justify-center items-center space-x-2 text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Waiting for webhook confirmation...</span>
              </div>
            )}
            
            <button 
              className="bg-gray-800 text-white px-6 py-2 rounded-lg text-sm" 
              onClick={simulateWebhook}
              disabled={!!sseStatus}
            >
              Simulate Webhook Success
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

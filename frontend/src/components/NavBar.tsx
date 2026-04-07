import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function NavBar() {
  return (
    <nav className="border-b border-gray-800 bg-black text-white p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-xl font-bold text-blue-400">AgentMart</Link>
          <Link href="/post" className="hover:text-blue-300">Post Request</Link>
          <Link href="/dashboard" className="hover:text-blue-300">Seller Dashboard</Link>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}

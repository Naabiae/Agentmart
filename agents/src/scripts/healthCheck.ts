import { getContracts, getProvider } from "../chain/contracts";

async function check() {
    console.log("Checking Kite testnet connection...");
    const provider = getProvider();
    const network = await provider.getNetwork();
    console.log(`Connected to network: ${network.name} (chainId: ${network.chainId})`);

    const contracts = getContracts();
    console.log(`OrderBook address: ${await contracts.OrderBook.getAddress()}`);

    const openOrders = await contracts.OrderBook.getOpenOrders(0, 10);
    console.log(`Open orders: ${openOrders.length}`);
}

check().catch(console.error);

import { DemandAgent } from "./DemandAgent";

describe("DemandAgent", () => {
  let agent: DemandAgent;

  beforeEach(() => {
    agent = new DemandAgent();
  });

  it("parses request correctly (mock mode)", async () => {
    const result = await agent.parseRequest("I need a laptop bag delivered to Lagos by next Monday under $20");
    expect(result.itemDescription).toBeDefined();
    expect(result.budgetNative).toBeGreaterThan(0);
    expect(result.deadlineDays).toBeGreaterThan(0);
    expect(["Goods", "Services", "Digital", "Logistics", "Other"]).toContain(result.category);
  });
});

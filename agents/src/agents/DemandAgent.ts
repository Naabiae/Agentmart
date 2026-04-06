import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "sk-ant-dummy",
});

export const orderSpecSchema = z.object({
  itemDescription: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["Goods", "Services", "Digital", "Logistics", "Other"]),
  budgetNative: z.number().positive("Budget must be positive"),
  deadlineDays: z.number().int().positive("Deadline days must be positive"),
  location: z.string(),
});

export type OrderSpec = z.infer<typeof orderSpecSchema>;

export class DemandAgent {
  async parseRequest(prompt: string): Promise<OrderSpec> {
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "sk-ant-dummy") {
      // Mock mode for tests/no-key environments
      return this.mockParse(prompt);
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      tools: [
        {
          name: "extract_order",
          description: "Extract structured order information from user request",
          input_schema: {
            type: "object",
            properties: {
              itemDescription: { type: "string", description: "Detailed description of what the user wants" },
              category: { type: "string", enum: ["Goods", "Services", "Digital", "Logistics", "Other"] },
              budgetNative: { type: "number", description: "Budget in USD" },
              deadlineDays: { type: "integer", description: "Number of days from now until deadline" },
              location: { type: "string", description: "Delivery or service location" }
            },
            required: ["itemDescription", "category", "budgetNative", "deadlineDays", "location"]
          }
        }
      ],
      tool_choice: { type: "tool", name: "extract_order" },
      messages: [{ role: "user", content: prompt }]
    });

    const toolCall = response.content.find(c => c.type === "tool_use") as any;
    if (!toolCall) throw new Error("Failed to extract order details");

    return orderSpecSchema.parse(toolCall.input);
  }

  private mockParse(prompt: string): OrderSpec {
    // Simple regex for mocked tests
    return {
      itemDescription: "Laptop bag delivery",
      category: "Goods",
      budgetNative: 20,
      deadlineDays: 7,
      location: "Lagos"
    };
  }
}

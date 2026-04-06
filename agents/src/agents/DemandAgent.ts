import { z } from "zod";
import OpenAI from "openai";
import * as dotenv from "dotenv";

dotenv.config();

// Connect to a local or hosted OpenAI-compatible Gemma 4 endpoint
// Examples: Ollama (http://localhost:11434/v1), vLLM, or Hugging Face Inference Endpoints
const openai = new OpenAI({
  apiKey: process.env.GEMMA_API_KEY || "sk-dummy-key",
  baseURL: process.env.GEMMA_API_BASE_URL || "http://localhost:11434/v1", // Defaulting to local Ollama
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
    if (!process.env.GEMMA_API_KEY || process.env.GEMMA_API_KEY === "sk-dummy-key") {
      // Mock mode for tests/no-key environments
      return this.mockParse(prompt);
    }

    const response = await openai.chat.completions.create({
      model: process.env.GEMMA_MODEL_NAME || "gemma-4:31b", // Targeting Gemma 4 31B Dense model
      messages: [
        {
          role: "system",
          content: "You are an expert AI agent that extracts structured e-commerce orders from natural language requests. You MUST respond with a JSON object that satisfies the provided schema."
        },
        { 
          role: "user", 
          content: prompt 
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_order",
            description: "Extract structured order information from user request",
            parameters: {
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
        }
      ],
      tool_choice: { type: "function", function: { name: "extract_order" } }
    });

    const toolCall = response.choices[0].message.tool_calls?.[0] as any;
    if (!toolCall) throw new Error("Failed to extract order details using Gemma 4");

    const args = JSON.parse(toolCall.function.arguments);
    return orderSpecSchema.parse(args);
  }

  private mockParse(prompt: string): OrderSpec {
    // Simple mock for tests
    return {
      itemDescription: "Laptop bag delivery",
      category: "Goods",
      budgetNative: 20,
      deadlineDays: 7,
      location: "Lagos"
    };
  }
}

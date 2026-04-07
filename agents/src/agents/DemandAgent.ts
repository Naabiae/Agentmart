import { z } from "zod";
import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config();

export const orderSpecSchema = z.object({
  itemDescription: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["Goods", "Services", "Digital", "Logistics", "Other"]),
  budgetNative: z.number().positive("Budget must be positive"),
  deadlineDays: z.number().int().positive("Deadline days must be positive"),
  location: z.string(),
});

export type OrderSpec = z.infer<typeof orderSpecSchema>;

const geminiSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    itemDescription: { type: SchemaType.STRING, description: "Detailed description of what the user wants" },
    category: { type: SchemaType.STRING, description: "Category (Goods, Services, Digital, Logistics, Other)" },
    budgetNative: { type: SchemaType.NUMBER, description: "Budget in USD" },
    deadlineDays: { type: SchemaType.INTEGER, description: "Number of days from now until deadline" },
    location: { type: SchemaType.STRING, description: "Delivery or service location" }
  },
  required: ["itemDescription", "category", "budgetNative", "deadlineDays", "location"]
};

export class DemandAgent {
  async parseRequest(prompt: string): Promise<OrderSpec> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "sk-dummy-key") {
      console.log("No Gemini API key found, using mock.");
      return this.mockParse(prompt);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // We use gemini-1.5-flash as it is fast and supports structured JSON schema output
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: geminiSchema,
      }
    });

    const result = await model.generateContent(`Extract the e-commerce order details from the following natural language request:\n\n"${prompt}"`);
    const text = result.response.text();
    
    try {
      const parsed = JSON.parse(text);
      return orderSpecSchema.parse(parsed);
    } catch (e) {
      console.error("Failed to parse Gemini output:", text);
      throw e;
    }
  }

  private mockParse(prompt: string): OrderSpec {
    return {
      itemDescription: "Laptop bag delivery",
      category: "Goods",
      budgetNative: 20,
      deadlineDays: 7,
      location: "Lagos"
    };
  }
}

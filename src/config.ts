import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("Missing ANTHROPIC_API_KEY in .env");
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  modelName: process.env.MODEL_NAME ?? "claude-sonnet-4-6",
};

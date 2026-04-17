import Anthropic from "@anthropic-ai/sdk";

const heliconeKey = process.env.HELICONE_API_KEY;

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  ...(heliconeKey
    ? {
        baseURL: "https://anthropic.helicone.ai",
        defaultHeaders: {
          "Helicone-Auth": `Bearer ${heliconeKey}`,
        },
      }
    : {}),
});
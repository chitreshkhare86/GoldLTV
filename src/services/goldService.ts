import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface GoldAnalysisResult {
  purityKarat: string | null;
  purityPercentage: number | null;
  fineness: string | null;
  description: string;
  confidence: number;
}

export async function analyzeGoldHallmark(imageBase64: string): Promise<GoldAnalysisResult> {
  const prompt = `
    Analyze this image of a gold hallmark stamp. 
    Identify the purity of the gold (e.g., 22K, 18K, 14K or fineness like 916, 750, 585).
    Look for BIS logos, hallmark symbols, and numeric codes.
    
    Return the result in JSON format:
    {
      "purityKarat": "e.g., 22K",
      "purityPercentage": 91.6,
      "fineness": "916",
      "description": "Short explanation of what you see (symbols, marks)",
      "confidence": 0.0 to 1.0
    }
    If you cannot find a hallmark, return null for the purity fields.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64.split(',')[1] || imageBase64,
                mimeType: "image/jpeg"
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze hallmark image.");
  }
}

export interface GoldPrices {
  usd: number;
  inr: number;
}

export async function getLiveGoldPrices(): Promise<GoldPrices> {
  const prompt = "What is the current live market price of 24K gold per gram in USD and in INR (India)? Return a JSON object with keys 'usd' and 'inr'. Example: {\"usd\": 78.50, \"inr\": 7540.20}";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || '{"usd": 78.50, "inr": 7500}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Price Fetch Error:", error);
    return { usd: 78.50, inr: 7500 }; 
  }
}

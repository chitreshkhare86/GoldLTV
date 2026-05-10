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
  usd24k: number;
  usd22k: number;
  usd18k: number;
  inr24k: number;
  inr22k: number;
  inr18k: number;
}

export async function getLiveGoldPrices(): Promise<GoldPrices> {
  const prompt = `What are the current live market prices for 24K, 22K, and 18K gold per gram in USD and in INR (India)? 
  Return a JSON object with keys: usd24k, usd22k, usd18k, inr24k, inr22k, inr18k. 
  Example: {"usd24k": 78.50, "usd22k": 72.10, "usd18k": 59.00, "inr24k": 7500, "inr22k": 6875, "inr18k": 5625}`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text || '{"usd24k": 78.50, "usd22k": 72.10, "usd18k": 59.00, "inr24k": 7500, "inr22k": 6875, "inr18k": 5625}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Price Fetch Error:", error);
    return { 
      usd24k: 78.50, usd22k: 72.00, usd18k: 58.00, 
      inr24k: 7500, inr22k: 6875, inr18k: 5625 
    }; 
  }
}

export interface BranchInfo {
  name: string;
  address: string;
  distance?: string;
  link: string;
}

export async function findNearestCsbBranch(lat: number, lng: number): Promise<BranchInfo | null> {
  const prompt = `Find the nearest CSB Bank branch to these coordinates: latitude ${lat}, longitude ${lng}. 
  Return a JSON object with: 
  {
    "name": "Branch Name",
    "address": "Full Address",
    "distance": "approx distance",
    "link": "Google Maps Link"
  }
  If no branch is found nearby or in India, return null.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "null";
    return JSON.parse(text);
  } catch (error) {
    console.error("Branch Search Error:", error);
    return null;
  }
}

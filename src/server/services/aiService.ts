import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Simple cost logging
export function logCostMetric(endpoint: string, uid: string | undefined, ip: string, inputLength: number, success: boolean) {
  const timestamp = new Date().toISOString();
  console.log(`[AI Cost Log] ${timestamp} | Endpoint: ${endpoint} | User: ${uid || ip} | InputLen: ${inputLength} | Success: ${success}`);
}

// Simple in-memory cache for deterministic AI endpoints
const aiCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function getCachedAiResult(cacheKey: string) {
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  return null;
}

export function setCachedAiResult(cacheKey: string, result: any) {
  // Prevent memory leak
  if (aiCache.size > 500) {
    aiCache.clear();
  }
  aiCache.set(cacheKey, { result, timestamp: Date.now() });
}

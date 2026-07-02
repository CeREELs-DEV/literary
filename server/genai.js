// server/genai.js
import { GoogleGenAI } from '@google/genai'

// Shared Gemini client factory. Null when image generation is unavailable.
export function defaultGenAi() {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

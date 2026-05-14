/**
 * lib/gemini.ts
 * Robust Failover Engine for Gemini API
 * Implements Nested Rotation: [API Keys] x [Model Chain]
 */

export const MODEL_CHAIN = [
  "gemini-2.5-flash",       // 20 RPD — baseline
  "gemini-3.1-flash-lite",  // 500 RPD — TULANG PUNGGUNG
  "gemini-2.5-flash-lite",  // 20 RPD — fast & cheap
  "gemini-3-flash",         // 20 RPD — latest
];

// Note: Using standard stable model names compatible with v1beta
const STICKY_STORAGE_KEY = "GEMINI_STICKY_STATE";

interface StickyState {
  keyIndex: number;
  modelIndex: number;
  date: string;
}

export interface GeminiResponse {
  text: string;
  modelUsed: string;
  keyUsedIndex: number;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Persists the last successful working combination
 */
const saveStickyState = (keyIndex: number, modelIndex: number) => {
  if (typeof window === "undefined") return;
  const state: StickyState = {
    keyIndex,
    modelIndex,
    date: new Date().toISOString().split("T")[0]
  };
  localStorage.setItem(STICKY_STORAGE_KEY, JSON.stringify(state));
};

/**
 * Retrieves the last working combination if it was from today
 */
const getStickyState = (): StickyState | null => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(STICKY_STORAGE_KEY);
  if (!saved) return null;
  try {
    const state = JSON.parse(saved) as StickyState;
    const today = new Date().toISOString().split("T")[0];
    return state.date === today ? state : null;
  } catch {
    return null;
  }
};

/**
 * Core calling function with nested rotation
 */
export async function callGeminiWithFallback(
  prompt: string, 
  apiKeys: string[], 
  systemInstruction?: string,
  isJson: boolean = false
): Promise<GeminiResponse> {
  const sticky = getStickyState();
  
  // Start from sticky state or zero
  let startKeyIdx = sticky?.keyIndex || 0;
  let startModelIdx = sticky?.modelIndex || 0;

  // Ensure indices are valid (in case keys were removed)
  if (startKeyIdx >= apiKeys.length) startKeyIdx = 0;

  for (let k = 0; k < apiKeys.length; k++) {
    const keyIdx = (startKeyIdx + k) % apiKeys.length;
    const key = apiKeys[keyIdx];

    for (let m = 0; m < MODEL_CHAIN.length; m++) {
      // For the very first key, start from sticky model. For subsequent keys, start from model 0.
      const modelIdx = k === 0 ? (startModelIdx + m) % MODEL_CHAIN.length : m;
      const model = MODEL_CHAIN[modelIdx];

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
              generationConfig: isJson ? { response_mime_type: "application/json" } : undefined,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          
          if (text) {
            saveStickyState(keyIdx, modelIdx);
            return { text, modelUsed: model, keyUsedIndex: keyIdx };
          }
          throw new Error("Empty response from Gemini");
        }

        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = errorData?.error?.message || "Unknown error";

        // Classification
        if (status === 429 || status === 503 || status === 404 || status === 500) {
          console.warn(`[Gemini Rotator] ${model} failed with ${status}. Retrying next model...`);
          await delay(400);
          continue; // Try next model
        }

        if (status === 401 || status === 403) {
          console.error(`[Gemini Rotator] Key ${keyIdx} Invalid (${status}). Moving to next key.`);
          break; // Break model loop, try next key
        }

        // 400 Bad Request (Invalid Prompt/Config) - Don't retry
        throw new Error(`Gemini API Error (${status}): ${msg}`);

      } catch (err: any) {
        if (err.message && err.message.includes("Gemini API Error")) throw err;
        console.error(`[Gemini Rotator] Unexpected error on ${model}:`, err);
        continue;
      }
    }
  }

  throw new Error("Semua kombinasi API Key dan Model telah mencapai batas kuota atau gagal. Silakan coba lagi nanti.");
}

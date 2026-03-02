/**
 * Receipt OCR service using Google Cloud Vision API.
 *
 * Flow:
 * 1. User takes photo of receipt
 * 2. Image is sent to Google Vision API for text detection
 * 3. Raw text is parsed to extract line items, tax, tip, total
 * 4. Returns structured data that populates the bill form
 */

import { OCRResult } from "../types";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";
const API_KEY = process.env.GOOGLE_CLOUD_VISION_API_KEY;

// ─── Scan Receipt Image ─────────────────────────────────
export async function scanReceipt(imageBase64: string): Promise<OCRResult> {
  const response = await fetch(`${VISION_API_URL}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: "TEXT_DETECTION", maxResults: 1 }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("OCR request failed");
  }

  const data = await response.json();
  const text = data.responses?.[0]?.fullTextAnnotation?.text || "";

  return parseReceiptText(text);
}

// ─── Parse Raw Receipt Text ─────────────────────────────
export function parseReceiptText(rawText: string): OCRResult {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: { name: string; price: number }[] = [];
  let subtotal: number | undefined;
  let tax: number | undefined;
  let tip: number | undefined;
  let total: number | undefined;

  // Price pattern: matches $12.99, 12.99, $ 12.99
  const pricePattern = /\$?\s?(\d+\.\d{2})/;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const priceMatch = line.match(pricePattern);

    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);

    // Categorize line
    if (lower.includes("subtotal") || lower.includes("sub total") || lower.includes("sub-total")) {
      subtotal = price;
    } else if (lower.includes("tax")) {
      tax = price;
    } else if (lower.includes("tip") || lower.includes("gratuity")) {
      tip = price;
    } else if (lower.includes("total") || lower.includes("amount due") || lower.includes("balance")) {
      total = price;
    } else {
      // It's a menu item — extract name (everything before the price)
      const name = line.replace(pricePattern, "").replace(/\$/, "").trim();
      if (name.length > 1 && price > 0 && price < 500) {
        items.push({ name, price });
      }
    }
  }

  // Confidence scoring based on what we found
  let confidence = 0;
  if (items.length > 0) confidence += 0.4;
  if (subtotal !== undefined) confidence += 0.2;
  if (total !== undefined) confidence += 0.2;
  if (tax !== undefined) confidence += 0.1;
  if (tip !== undefined) confidence += 0.1;

  return { items, subtotal, tax, tip, total, confidence };
}

// ─── Convert image URI to base64 ────────────────────────
export async function imageUriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

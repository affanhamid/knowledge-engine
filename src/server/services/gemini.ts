import { readFileSync } from "fs";
import { GoogleGenAI } from "@google/genai";

import { env } from "~/env";
import { loadPrompt } from "./prompt-loader";

function getClient() {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

const MODEL = "gemini-2.0-flash";

async function generate(systemPrompt: string, userContent: string): Promise<string> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    config: { systemInstruction: systemPrompt },
  });
  return response.text ?? "";
}

function extractJsonArray(raw: string): string[] {
  // Strip markdown fences
  const text = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  // Find the JSON array in the response (Gemini sometimes adds preamble)
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as string[];
  } catch {
    // Fallback: extract quoted strings individually when JSON is malformed
    const items: string[] = [];
    const re = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(match[0])) !== null) {
      items.push(m[1]!.replace(/\\"/g, '"').replace(/\\n/g, "\n"));
    }
    return items;
  }
}

export async function extractTextFromFile(
  filePath: string,
  mimeType: string,
): Promise<string> {
  const client = getClient();
  const data = readFileSync(filePath);
  const base64 = data.toString("base64");

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: "Extract ALL text content from this document. Output only the extracted text, preserving structure with headings and bullet points where appropriate. No commentary." },
        ],
      },
    ],
  });
  return response.text ?? "";
}

export type GeneratedGraph = {
  nodes: { id: string; label: string; content: string }[];
  edges: { source: string; target: string; label: string }[];
};

export async function generateGraphFromFile(
  filePath: string,
  mimeType: string,
): Promise<GeneratedGraph> {
  const client = getClient();
  const prompt = loadPrompt("generate-graph");
  const data = readFileSync(filePath).toString("base64");

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data } },
          { text: "Generate a knowledge graph from this document." },
        ],
      },
    ],
    config: { systemInstruction: prompt },
  });

  const raw = (response.text ?? "")
    .replace(/```json?\n?/g, "")
    .replace(/```/g, "")
    .trim();

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini did not return valid JSON");

  const parsed = JSON.parse(match[0]) as GeneratedGraph;
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    throw new Error("Invalid graph structure from Gemini");
  }
  return parsed;
}

export async function cleanupBlurt(rawTranscript: string): Promise<string> {
  const prompt = loadPrompt("cleanup-blurt");
  return generate(prompt, rawTranscript);
}

export async function extractGems(
  blurtCleanup: string,
  original: { text: string } | { filePath: string; mimeType: string },
): Promise<string[]> {
  const prompt = loadPrompt("extract-gems");
  const client = getClient();

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  if ("text" in original) {
    parts.push({
      text: `ORIGINAL:\n${original.text}\n\nRECALL:\n${blurtCleanup}`,
    });
  } else {
    const data = readFileSync(original.filePath).toString("base64");
    parts.push({ inlineData: { mimeType: original.mimeType, data } });
    parts.push({
      text: `The above is the ORIGINAL source material.\n\nRECALL:\n${blurtCleanup}`,
    });
  }

  const response = await client.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: { systemInstruction: prompt },
  });
  return extractJsonArray(response.text ?? "");
}

export async function generateQuestions(
  cleanedText: string,
): Promise<string[]> {
  const prompt = loadPrompt("generate-questions");
  const raw = await generate(prompt, cleanedText);
  return extractJsonArray(raw);
}

export async function generateMermaidSkeleton(
  cleanedText: string,
): Promise<string> {
  const prompt = loadPrompt("generate-mermaid");
  const raw = await generate(prompt, cleanedText);
  return raw.replace(/```mermaid?\n?/g, "").replace(/```/g, "").trim();
}

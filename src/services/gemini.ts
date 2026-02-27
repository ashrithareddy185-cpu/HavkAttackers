import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const VISION_MODEL = "gemini-3.1-pro-preview";
export const TTS_MODEL = "gemini-2.5-flash-preview-tts";

export interface Message {
  role: "user" | "model";
  text: string;
  image?: string; // base64
  audio?: string; // base64
}

export async function describeImage(base64Image: string, prompt: string, history: Message[], language: string = "English") {
  const imagePart = base64Image ? {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(",")[1],
    },
  } : null;

  const historyParts = history.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  const systemInstruction = `You are a helpful AI assistant. Always respond in ${language}. If an image is provided, analyze it thoroughly.`;

  const parts = [];
  if (imagePart) parts.push(imagePart);
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: [
      ...historyParts,
      { parts }
    ],
    config: {
      systemInstruction
    }
  });

  return response.text;
}

export async function generateSpeech(text: string) {
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

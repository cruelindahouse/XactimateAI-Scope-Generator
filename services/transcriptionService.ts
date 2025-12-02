/**
 * TRANSCRIPTION SERVICE - "Gemini Two-Pass" Strategy
 * 
 * Pass 1: Audio → Text with timestamps
 * This converts audio blob to structured text that can be injected
 * into the main analysis prompt with proper weight.
 * 
 * WHY: Raw audio gets ~2% attention weight vs 98% for video frames.
 * Text injected in prompt gets treated as INSTRUCTION, not content.
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

const MODEL_NAME = "gemini-2.5-flash";
const API_KEY = process.env.API_KEY;

export interface TranscriptSegment {
  timestamp: string;
  text: string;
}

export interface TranscriptionResult {
  success: boolean;
  segments: TranscriptSegment[];
  rawTranscript: string;
  formattedContext: string;
}

/**
 * PASS 1: Transcribe audio to text with timestamps
 * Uses Gemini as a dedicated transcription engine
 */
export const transcribeAudio = async (
  audioBase64: string,
  mimeType: string = "audio/wav"
): Promise<TranscriptionResult> => {
  
  if (!audioBase64) {
    return {
      success: false,
      segments: [],
      rawTranscript: "",
      formattedContext: ""
    };
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const transcriptionPrompt = `
You are a professional transcription engine. Your ONLY job is to transcribe the audio accurately.

TASK: Listen to this audio and transcribe it verbatim with timestamps.

OUTPUT FORMAT (strictly follow this):
[MM:SS] Transcribed text here
[MM:SS] Next segment of speech
[MM:SS] Continue until audio ends

RULES:
1. Include timestamp at the start of each natural speech segment (every 5-10 seconds or at pauses)
2. Transcribe EXACTLY what is said - do not summarize or interpret
3. If you hear room names, damage descriptions, or specific instructions, transcribe them precisely
4. If audio is unclear, write [inaudible] for that portion
5. If audio contains technical terms (like Xactimate codes), transcribe them as heard

IMPORTANT: Output ONLY the timestamped transcript. No commentary, no analysis, no JSON.

BEGIN TRANSCRIPTION:
`;

  try {
    console.log("🎤 Pass 1: Starting audio transcription...");
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: transcriptionPrompt }
        ]
      },
      config: {
        temperature: 0.1, // Low temperature for accuracy
        maxOutputTokens: 4096,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      }
    });

    const rawTranscript = response.text || "";
    
    if (!rawTranscript || rawTranscript.length < 10) {
      console.warn("⚠️ Transcription returned empty or very short result");
      return {
        success: false,
        segments: [],
        rawTranscript: "",
        formattedContext: ""
      };
    }

    // Parse the transcript into segments
    const segments = parseTranscript(rawTranscript);
    
    // Build the formatted context for injection
    const formattedContext = buildVoiceContext(segments, rawTranscript);

    console.log(`✅ Pass 1 Complete: ${segments.length} segments transcribed`);
    
    return {
      success: true,
      segments,
      rawTranscript,
      formattedContext
    };

  } catch (error) {
    console.error("❌ Transcription failed:", error);
    return {
      success: false,
      segments: [],
      rawTranscript: "",
      formattedContext: ""
    };
  }
};

/**
 * Parse raw transcript text into structured segments
 */
const parseTranscript = (rawText: string): TranscriptSegment[] => {
  const segments: TranscriptSegment[] = [];
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  
  // Pattern: [MM:SS] or [M:SS] or [HH:MM:SS]
  const timestampPattern = /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.+)$/;
  
  for (const line of lines) {
    const match = line.trim().match(timestampPattern);
    if (match) {
      segments.push({
        timestamp: match[1],
        text: match[2].trim()
      });
    } else if (line.trim().length > 5 && !line.startsWith('BEGIN') && !line.startsWith('END')) {
      // Line without timestamp - append to last segment or create new
      if (segments.length > 0) {
        segments[segments.length - 1].text += ' ' + line.trim();
      } else {
        segments.push({
          timestamp: "00:00",
          text: line.trim()
        });
      }
    }
  }
  
  return segments;
};

/**
 * Build the voice context string for prompt injection
 * This is the KEY function - it formats the transcript so Gemini
 * treats it as an INSTRUCTION rather than background content
 */
const buildVoiceContext = (
  segments: TranscriptSegment[], 
  rawTranscript: string
): string => {
  
  if (segments.length === 0 && rawTranscript.length < 20) {
    return "";
  }

  // If we have structured segments, use them
  let transcriptBlock = "";
  
  if (segments.length > 0) {
    transcriptBlock = segments
      .map(seg => `[${seg.timestamp}] "${seg.text}"`)
      .join('\n');
  } else {
    // Fallback to raw transcript if parsing failed
    transcriptBlock = rawTranscript;
  }

  return `
╔══════════════════════════════════════════════════════════════════════╗
║  ESTIMATOR VOICE COMMANDS - ACTIVE (MUST OVERRIDE VISUAL ANALYSIS)   ║
╚══════════════════════════════════════════════════════════════════════╝

${transcriptBlock}

┌──────────────────────────────────────────────────────────────────────┐
│ CRITICAL INSTRUCTIONS FOR PROCESSING VOICE COMMANDS:                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ 1. VOICE > VISUAL: If the estimator mentions damage you cannot see   │
│    in the frames (e.g., "mold behind the mirror"), TRUST THE VOICE   │
│    and add the corresponding line items.                             │
│                                                                      │
│ 2. ROOM NAMES: Use the room names spoken by the estimator, not       │
│    generic names you infer from the video.                           │
│                                                                      │
│ 3. SKIP COMMANDS: If estimator says "skip this room" or "do not      │
│    scope this area", DO NOT generate items for that space.           │
│                                                                      │
│ 4. SPECIFIC CODES: If estimator mentions Xactimate codes (HMR, WTR,  │
│    DMO, etc.), include those specific codes in the output.           │
│                                                                      │
│ 5. TIMESTAMP CORRELATION: Voice timestamp roughly matches video      │
│    timestamp (±5 seconds). Use this to identify which room the       │
│    estimator is describing.                                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
`;
};

/**
 * Combine multiple audio sources into one transcription
 * Useful when user uploads video audio + separate voice notes
 */
export const transcribeMultipleAudio = async (
  audioSources: Array<{ base64: string; mimeType: string; label?: string }>
): Promise<TranscriptionResult> => {
  
  const allSegments: TranscriptSegment[] = [];
  const allRawParts: string[] = [];
  
  for (const source of audioSources) {
    const result = await transcribeAudio(source.base64, source.mimeType);
    if (result.success) {
      // Add label prefix if provided
      const labelPrefix = source.label ? `[${source.label}] ` : "";
      result.segments.forEach(seg => {
        allSegments.push({
          timestamp: seg.timestamp,
          text: labelPrefix + seg.text
        });
      });
      allRawParts.push(result.rawTranscript);
    }
  }
  
  if (allSegments.length === 0) {
    return {
      success: false,
      segments: [],
      rawTranscript: "",
      formattedContext: ""
    };
  }
  
  // Sort by timestamp
  allSegments.sort((a, b) => {
    const timeA = parseTimestamp(a.timestamp);
    const timeB = parseTimestamp(b.timestamp);
    return timeA - timeB;
  });
  
  return {
    success: true,
    segments: allSegments,
    rawTranscript: allRawParts.join('\n\n---\n\n'),
    formattedContext: buildVoiceContext(allSegments, "")
  };
};

/**
 * Helper to parse timestamp string to seconds
 */
const parseTimestamp = (ts: string): number => {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

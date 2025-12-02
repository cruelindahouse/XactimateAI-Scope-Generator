# XactimateAI Scope Generator

## Architecture: "Gemini Two-Pass" Strategy

This application uses a **Two-Pass** architecture to solve the "Audio Deafness" problem in multimodal LLMs.

### The Problem
When processing video + audio simultaneously:
- Video frames: ~46,000 tokens (98% of attention)
- Audio: ~750 tokens (2% of attention)

Raw audio gets **drowned out** by visual tokens, causing the AI to ignore voice commands.

### The Solution
```
Pass 1: Audio → Gemini → Timestamped Transcript (Text)
Pass 2: Video Frames + Text Transcript → Scope Analysis
```

By converting audio to text FIRST, voice commands become **instructions** with proper weight in the attention mechanism.

## Files Structure

```
services/
├── geminiService.ts        # Main orchestrator (Two-Pass logic)
├── transcriptionService.ts # Pass 1: Audio → Text with timestamps
└── rateLimiter.ts          # API rate limiting

utils/
├── logisticsEngine.ts      # 10 rules for General Conditions
├── roomSanitizer.ts        # Ghost room deduplication
├── xactimateRules.ts       # Code validation
└── mediaExtractor.ts       # Video frame extraction
```

## Logistics Engine v13 Rules

| # | Code | Trigger |
|---|------|---------|
| 1 | DMO DBR/DTRLR | Debris removal based on volume |
| 2 | TMP TLT | Portable toilet (fire/catastrophic) |
| 3 | LAB SUP | Supervision (complexity-based) |
| 4 | TMP FNC | Temporary fencing (exterior) |
| 5 | WTR BARR + NAFAN | Containment (demo/severity) |
| 6 | WTR EQ | Equipment setup |
| 7 | WTR ESRVD | Emergency service call |
| 8 | DMO MASKFL | Floor protection |
| 9 | CON ROOM | Content manipulation |
| 10 | Implicit Demo | Install items assume prior removal |

## Voice Command Examples

The estimator can speak commands during video walkthrough:

- `"This is the master bathroom"` → Sets room name
- `"There's mold behind the mirror, add HMR"` → Adds hidden damage
- `"Skip this room, it's unaffected"` → Excludes from scope
- `"Clean carpet only, no reconstruction"` → Limits scope

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set `API_KEY` in `.env.local` to your Gemini API key
3. Run the app: `npm run dev`

## Version
v13 - Two-Pass Architecture + Logistics Engine v13

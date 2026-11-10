import { NextResponse } from "next/server";

export const maxDuration = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeMimeType(rawMime: string | undefined, mode: string): string {
  if (mode !== "call") {
    if (!rawMime) return "image/jpeg";
    return rawMime;
  }
  const m = (rawMime || "").toLowerCase().trim();
  if (!m || m === "audio/mp3" || m === "audio/mpeg") return "audio/mp3";
  if (m.includes("m4a") || m === "video/mp4" || m === "audio/mp4") return "audio/mp4";
  if (m.includes("aac")) return "audio/aac";
  if (m.includes("wav")) return "audio/wav";
  if (m.includes("ogg") || m.includes("opus")) return "audio/ogg";
  if (m.includes("webm")) return "audio/webm";
  if (m.includes("amr")) return "audio/amr";
  return "audio/mp3";
}

export async function POST(req: Request) {
  const startTime = Date.now();
  const GLOBAL_TIME_BUDGET_MS = 50000;

  try {
    const body = await req.json();
    const { mode, fileBase64, mimeType, context } = body;

    if (!fileBase64) {
      return NextResponse.json({ error: "No file data provided" }, { status: 400 });
    }

    const approxSizeMB = (fileBase64.length * 0.75) / (1024 * 1024);
    if (approxSizeMB > 3.6) {
      return NextResponse.json(
        {
          error: `File is too large (${approxSizeMB.toFixed(1)} MB). Please upload a compressed audio recording (.mp3 / .m4a / .aac) under 3.5 MB.`,
        },
        { status: 413 }
      );
    }

    const cleanMime = normalizeMimeType(mimeType, mode);

    let prompt = "";
    if (mode === "call") {
      prompt = `You are an AI admissions and academic analyst for Pioneer Academy, Bikaner. Listen to this call recording (Hindi/Hinglish/Marwari/English). Context: ${context}. Return ONLY a valid JSON object with keys: summary, transcript, action_items, sentiment. Keep transcript concise. No markdown formatting, no backticks.`;
    } else {
      prompt = `You are a senior faculty evaluator at Pioneer Academy, Bikaner. Evaluate this student subjective answer sheet. Context & Max Marks: ${context}. Return ONLY a valid JSON object with keys: suggested_marks, work_summary, strong_area, focus_area. No markdown formatting, no backticks.`;
    }

    let resultData = null;
    const errors: string[] = [];

    // -----------------------------------------------------------------
    // 1. PRIMARY: GOOGLE GEMINI (Fast Flash Priority + Dynamic Fallback)
    // -----------------------------------------------------------------
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      let candidateModels = [
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash",
        "models/gemini-2.0-flash-lite",
        "models/gemini-1.5-flash",
      ];

      try {
        const listController = new AbortController();
        const listTimer = setTimeout(() => listController.abort(), 3500);
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
          { signal: listController.signal }
        );
        clearTimeout(listTimer);

        if (listRes.ok) {
          const listData = await listRes.json();
          const available = (listData.models || [])
            .filter(
              (m: any) =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name.includes("flash") &&
                !m.name.includes("tts") &&
                !m.name.includes("image") &&
                !m.name.includes("thinking") &&
                !m.name.includes("8b-exp")
            )
            .map((m: any) => m.name);

          if (available.length > 0) {
            const priorityValid = candidateModels.filter((c) => available.includes(c));
            candidateModels = Array.from(new Set([...priorityValid, ...available])).slice(0, 4);
          }
        }
      } catch {
        // Proceed with default fast candidateModels if model listing times out
      }

      for (const modelName of candidateModels) {
        if (resultData) break;
        if (Date.now() - startTime > GLOBAL_TIME_BUDGET_MS) {
          errors.push("Stopped fallback loop at 50s to prevent 504 gateway timeout");
          break;
        }

        for (let attempt = 1; attempt <= 2; attempt++) {
          if (Date.now() - startTime > GLOBAL_TIME_BUDGET_MS) break;

          const attemptController = new AbortController();
          const attemptTimer = setTimeout(() => attemptController.abort(), 22000);

          try {
            console.log(`Trying Gemini model: ${modelName} (Attempt ${attempt}) with ${cleanMime}...`);
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: attemptController.signal,
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: prompt },
                        {
                          inline_data: {
                            mime_type: cleanMime,
                            data: fileBase64,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.2,
                  },
                }),
              }
            );
            clearTimeout(attemptTimer);

            if (response.ok) {
              const data = await response.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
              resultData = parseAiJson(rawText);
              console.log(`Success with ${modelName}!`);
              break;
            } else {
              const errData = await response.json().catch(() => ({}));
              const errMsg = errData?.error?.message || `HTTP ${response.status}`;

              if (response.status === 400 && errMsg.toLowerCase().includes("api key")) {
                errors.push(`Invalid GEMINI_API_KEY: ${errMsg}`);
                candidateModels = [];
                break;
              }

              if (
                attempt === 1 &&
                (response.status === 503 ||
                  errMsg.toLowerCase().includes("high demand") ||
                  errMsg.toLowerCase().includes("overloaded"))
              ) {
                errors.push(`${modelName} (Attempt ${attempt}): ${errMsg}`);
                await sleep(1500);
                continue;
              } else {
                errors.push(`${modelName}: ${errMsg}`);
                break;
              }
            }
          } catch (e: any) {
            clearTimeout(attemptTimer);
            const isTimeout = e.name === "AbortError";
            errors.push(
              `${modelName}: ${isTimeout ? "Timed out after 22s" : e.message}`
            );
            break;
          }
        }
      }
    } else {
      errors.push("GEMINI_API_KEY is not set in Vercel Environment Variables");
    }

    // -----------------------------------------------------------------
    // 2. FALLBACK: OPENAI
    // -----------------------------------------------------------------
    const openAIKey = process.env.OPENAI_API_KEY;
    if (openAIKey && !resultData && Date.now() - startTime < GLOBAL_TIME_BUDGET_MS) {
      try {
        if (mode !== "call") {
          const dataUrl = `data:${cleanMime};base64,${fileBase64}`;
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openAIKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const rawText = data?.choices?.[0]?.message?.content || "{}";
            resultData = parseAiJson(rawText);
          } else {
            const errData = await response.json().catch(() => ({}));
            errors.push(`OpenAI: ${errData?.error?.message || response.status}`);
          }
        }
      } catch (e: any) {
        errors.push(`OpenAI exception: ${e.message}`);
      }
    }

    if (!resultData) {
      return NextResponse.json(
        {
          error: `AI processing could not complete.\nDetails: ${errors.slice(0, 4).join(" | ")}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: resultData });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

function parseAiJson(rawText: string) {
  const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanedJson);
  } catch {
    return {
      summary: rawText,
      transcript: rawText,
      action_items: "Review manually",
      sentiment: "Neutral",
      suggested_marks: 0,
      work_summary: rawText,
      strong_area: "See summary",
      focus_area: "See summary",
    };
  }
}

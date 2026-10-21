import { NextResponse } from "next/server";

export const maxDuration = 60;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode, fileBase64, mimeType, context } = body;

    if (!fileBase64) {
      return NextResponse.json({ error: "No file data provided" }, { status: 400 });
    }

    let prompt = "";
    if (mode === "call") {
      prompt = `You are an AI admissions and academic analyst for Pioneer Academy, Bikaner. Listen to this call recording. Context: ${context}. Return ONLY a valid JSON object with keys: summary, transcript, action_items, sentiment. No markdown formatting, no backticks.`;
    } else {
      prompt = `You are a senior faculty evaluator at Pioneer Academy, Bikaner. Evaluate this student subjective answer sheet. Context & Max Marks: ${context}. Return ONLY a valid JSON object with keys: suggested_marks, work_summary, strong_area, focus_area. No markdown formatting, no backticks.`;
    }

    let resultData = null;
    const errors: string[] = [];

    // -----------------------------------------------------------------
    // 1. PRIMARY: GOOGLE GEMINI (gemini-3.8-flash + Dynamic Fallback)
    // -----------------------------------------------------------------
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      // First build a list of candidate Gemini models starting with gemini-3.8-flash
      let candidateModels = ["models/gemini-3.8-flash"];

      try {
        // Dynamically fetch all models enabled for this key so we never hit a 404 on fallback
        const listRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
        );
        if (listRes.ok) {
          const listData = await listRes.json();
          const available = (listData.models || [])
            .filter(
              (m: any) =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                (m.name.includes("flash") || m.name.includes("pro")) &&
                !m.name.includes("tts") &&
                !m.name.includes("image")
            )
            .map((m: any) => m.name);

          // Put gemini-3.8-flash first, followed by other valid flash/pro models
          candidateModels = Array.from(new Set(["models/gemini-3.8-flash", ...available]));
        }
      } catch {
        // Ignore list error and proceed with default candidate
      }

      for (const modelName of candidateModels) {
        if (resultData) break;

        // Try up to 2 attempts per model in case of temporary "high demand" (503/429) spikes
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`Trying Gemini model: ${modelName} (Attempt ${attempt})...`);
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: prompt },
                        {
                          inline_data: {
                            mime_type: mimeType || (mode === "call" ? "audio/mp3" : "image/jpeg"),
                            data: fileBase64,
                          },
                        },
                      ],
                    },
                  ],
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
              resultData = parseAiJson(rawText);
              console.log(`Success with ${modelName}!`);
              break;
            } else {
              const errData = await response.json().catch(() => ({}));
              const errMsg = errData?.error?.message || `HTTP ${response.status}`;

              // If model is experiencing a temporary demand spike, wait 2.5s and retry
              if (
                response.status === 503 ||
                response.status === 429 ||
                errMsg.toLowerCase().includes("high demand") ||
                errMsg.toLowerCase().includes("overloaded")
              ) {
                console.log(`${modelName} busy, waiting 2.5s before retry...`);
                errors.push(`${modelName} (Attempt ${attempt}): ${errMsg}`);
                await sleep(2500);
                continue;
              } else {
                // If 404 or unsupported, break inner retry loop and try next Gemini model
                errors.push(`${modelName}: ${errMsg}`);
                break;
              }
            }
          } catch (e: any) {
            errors.push(`${modelName} exception: ${e.message}`);
            break;
          }
        }
      }
    }

    // -----------------------------------------------------------------
    // 2. FALLBACK: OPENAI (Only if credits are available)
    // -----------------------------------------------------------------
    const openAIKey = process.env.OPENAI_API_KEY;
    if (openAIKey && !resultData && mode !== "call") {
      try {
        const dataUrl = `data:${mimeType || "image/jpeg"};base64,${fileBase64}`;
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
      } catch (e: any) {
        errors.push(`OpenAI exception: ${e.message}`);
      }
    }

    if (!resultData) {
      return NextResponse.json(
        {
          error: `AI processing could not complete.\nDetails: ${errors.slice(0, 3).join(" | ")}`,
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
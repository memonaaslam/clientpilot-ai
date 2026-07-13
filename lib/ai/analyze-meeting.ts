import OpenAI from "openai";

import {
  createSmartMeetingResult,
  type SmartMeetingResult
} from "@/lib/smart-meeting";

export type AIMeetingAnalysis = SmartMeetingResult & {
  budget: string;
  timeline: string;
  decisionMaker: string;
  requirements: string[];
  painPoints: string[];
  objections: string[];
  closingProbability: number;
  sentiment: "Positive" | "Neutral" | "Negative";
  proposalDraft: string;
};

type RawAIAnalysis = {
  summary?: unknown;
  actionItems?: unknown;
  followUp?: unknown;
  proposalPoints?: unknown;
  temperature?: unknown;
  score?: unknown;
  stage?: unknown;
  nextBestAction?: unknown;
  whatsappMessage?: unknown;
  emailMessage?: unknown;
  automationPlan?: unknown;
  missingInfo?: unknown;
  dealSignals?: unknown;
  riskSignals?: unknown;
  budget?: unknown;
  timeline?: unknown;
  decisionMaker?: unknown;
  requirements?: unknown;
  painPoints?: unknown;
  objections?: unknown;
  closingProbability?: unknown;
  sentiment?: unknown;
  proposalDraft?: unknown;
};

function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured."
    );
  }

  return new OpenAI({
    apiKey
  });
}

function textValue(
  value: unknown,
  fallback: string
): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const cleaned = value.trim();

  return cleaned || fallback;
}

function stringArray(
  value: unknown,
  fallback: string[] = []
): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string"
    )
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function numberValue(
  value: unknown,
  fallback: number
): number {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(number))
  );
}

function temperatureValue(
  value: unknown,
  fallback: "Hot" | "Warm" | "Cold"
): "Hot" | "Warm" | "Cold" {
  if (
    value === "Hot" ||
    value === "Warm" ||
    value === "Cold"
  ) {
    return value;
  }

  return fallback;
}

function sentimentValue(
  value: unknown
): "Positive" | "Neutral" | "Negative" {
  if (
    value === "Positive" ||
    value === "Negative"
  ) {
    return value;
  }

  return "Neutral";
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (
    trimmed.startsWith("{") &&
    trimmed.endsWith("}")
  ) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (
    firstBrace === -1 ||
    lastBrace === -1 ||
    lastBrace <= firstBrace
  ) {
    throw new Error(
      "AI response did not contain valid JSON."
    );
  }

  return trimmed.slice(
    firstBrace,
    lastBrace + 1
  );
}

function normalizeAnalysis(
  raw: RawAIAnalysis,
  fallback: SmartMeetingResult
): AIMeetingAnalysis {
  const score = numberValue(
    raw.score,
    fallback.score
  );

  const closingProbability = numberValue(
    raw.closingProbability,
    score
  );

  return {
    summary: textValue(
      raw.summary,
      fallback.summary
    ),

    actionItems: stringArray(
      raw.actionItems,
      fallback.actionItems
    ),

    followUp: textValue(
      raw.followUp,
      fallback.followUp
    ),

    proposalPoints: stringArray(
      raw.proposalPoints,
      fallback.proposalPoints
    ),

    temperature: temperatureValue(
      raw.temperature,
      fallback.temperature
    ),

    score,

    stage: textValue(
      raw.stage,
      fallback.stage
    ),

    nextBestAction: textValue(
      raw.nextBestAction,
      fallback.nextBestAction
    ),

    whatsappMessage: textValue(
      raw.whatsappMessage,
      fallback.whatsappMessage
    ),

    emailMessage: textValue(
      raw.emailMessage,
      fallback.emailMessage
    ),

    automationPlan: stringArray(
      raw.automationPlan,
      fallback.automationPlan
    ),

    missingInfo: stringArray(
      raw.missingInfo,
      fallback.missingInfo
    ),

    dealSignals: stringArray(
      raw.dealSignals,
      fallback.dealSignals
    ),

    riskSignals: stringArray(
      raw.riskSignals,
      fallback.riskSignals
    ),

    budget: textValue(
      raw.budget,
      "Not confirmed"
    ),

    timeline: textValue(
      raw.timeline,
      "Not confirmed"
    ),

    decisionMaker: textValue(
      raw.decisionMaker,
      "Not confirmed"
    ),

    requirements: stringArray(
      raw.requirements
    ),

    painPoints: stringArray(
      raw.painPoints
    ),

    objections: stringArray(
      raw.objections
    ),

    closingProbability,

    sentiment: sentimentValue(
      raw.sentiment
    ),

    proposalDraft: textValue(
      raw.proposalDraft,
      fallback.proposalPoints.join("\n")
    )
  };
}

export async function analyzeMeetingWithAI(
  title: string,
  transcript: string
): Promise<{
  analysis: AIMeetingAnalysis;
  mode: "openai" | "fallback";
  model: string | null;
}> {
  const fallback = createSmartMeetingResult(
    title,
    transcript
  );

  /*
    Keep costs controlled and avoid sending an
    extremely large transcript unexpectedly.
  */
  const transcriptForAnalysis =
    transcript.length > 30000
      ? transcript.slice(0, 30000)
      : transcript;

  try {
    const openai = createOpenAIClient();

    const model =
      process.env.OPENAI_ANALYSIS_MODEL?.trim() ||
      "gpt-4.1-mini";

    const response = await openai.responses.create({
      model,

      instructions: `
You are the AI sales intelligence engine inside ClientPilot AI by Makzora.

Analyze the meeting transcript accurately.

Do not invent facts.
If budget, timeline, decision maker, or another detail was not discussed, write "Not confirmed".

Return only one valid JSON object.
Do not use markdown.
Do not wrap the JSON in code fences.

Required JSON structure:

{
  "summary": "Professional meeting summary",
  "actionItems": ["Action item"],
  "followUp": "Recommended follow-up",
  "proposalPoints": ["Proposal point"],
  "temperature": "Hot | Warm | Cold",
  "score": 0,
  "stage": "Pipeline stage",
  "nextBestAction": "Best action",
  "whatsappMessage": "Ready-to-send WhatsApp follow-up",
  "emailMessage": "Ready-to-send email with subject and body",
  "automationPlan": ["Automation step"],
  "missingInfo": ["Missing detail"],
  "dealSignals": ["Positive signal"],
  "riskSignals": ["Risk signal"],
  "budget": "Budget exactly as discussed or Not confirmed",
  "timeline": "Timeline exactly as discussed or Not confirmed",
  "decisionMaker": "Decision maker or Not confirmed",
  "requirements": ["Client requirement"],
  "painPoints": ["Pain point"],
  "objections": ["Objection"],
  "closingProbability": 0,
  "sentiment": "Positive | Neutral | Negative",
  "proposalDraft": "Professional proposal draft based only on confirmed meeting information"
}

Scoring guidance:
- 80 to 100: strong buying intent and clear next step
- 60 to 79: interested but some information is missing
- 40 to 59: early opportunity needing follow-up
- 0 to 39: weak or unclear opportunity

Use concise, professional business English.
      `.trim(),

      input: `
Meeting title:
${title}

Meeting transcript:
${transcriptForAnalysis}
      `.trim()
    });

    const outputText =
      response.output_text?.trim();

    if (!outputText) {
      throw new Error(
        "OpenAI returned an empty meeting analysis."
      );
    }

    const parsed = JSON.parse(
      extractJson(outputText)
    ) as RawAIAnalysis;

    return {
      analysis: normalizeAnalysis(
        parsed,
        fallback
      ),
      mode: "openai",
      model
    };
  } catch (error) {
    console.error(
      "AI meeting analysis failed; using fallback:",
      error
    );

    return {
      analysis: {
        ...fallback,
        budget: "Not confirmed",
        timeline: "Not confirmed",
        decisionMaker: "Not confirmed",
        requirements: [],
        painPoints: [],
        objections: [],
        closingProbability:
          fallback.score,
        sentiment: "Neutral",
        proposalDraft:
          fallback.proposalPoints.join("\n")
      },
      mode: "fallback",
      model: null
    };
  }
}
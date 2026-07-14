import {
  createSupabaseAdminClient
} from "@/lib/sales-session";

export type OwnerApiUsageStatus =
  | "success"
  | "failed"
  | "fallback";

export type TokenUsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type TranscriptionUsageSummary =
  TokenUsageSummary & {
    audioSeconds: number;
    audioInputTokens: number;
    textInputTokens: number;
  };

type RecordOwnerApiUsageInput = {
  userId?: string | null;
  meetingId?: string | null;
  provider?: string;
  service: string;
  operation: string;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  audioSeconds?: number;
  fileSizeBytes?: number;
  estimatedCostUsd?: number;
  status: OwnerApiUsageStatus;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
};

type ModelRates = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

type TranscriptionRates = ModelRates & {
  estimatedUsdPerMinute: number;
};

function safeNumber(
  value: unknown,
  fallback = 0
) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
}

function getOptionalEnvironmentNumber(
  name: string
): number | null {
  const rawValue = process.env[name];

  if (!rawValue) {
    return null;
  }

  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function getAnalysisRates(
  model: string
): ModelRates {
  const environmentInput =
    getOptionalEnvironmentNumber(
      "OPENAI_ANALYSIS_INPUT_USD_PER_MILLION"
    );

  const environmentOutput =
    getOptionalEnvironmentNumber(
      "OPENAI_ANALYSIS_OUTPUT_USD_PER_MILLION"
    );

  if (
    environmentInput !== null &&
    environmentOutput !== null
  ) {
    return {
      inputUsdPerMillion: environmentInput,
      outputUsdPerMillion: environmentOutput
    };
  }

  const normalizedModel = model.toLowerCase();

  if (
    normalizedModel.startsWith("gpt-4.1-mini")
  ) {
    return {
      inputUsdPerMillion: 0.4,
      outputUsdPerMillion: 1.6
    };
  }

  if (
    normalizedModel.startsWith("gpt-4.1-nano")
  ) {
    return {
      inputUsdPerMillion: 0.1,
      outputUsdPerMillion: 0.4
    };
  }

  if (normalizedModel.startsWith("gpt-4.1")) {
    return {
      inputUsdPerMillion: 2,
      outputUsdPerMillion: 8
    };
  }

  if (
    normalizedModel.startsWith("gpt-4o-mini")
  ) {
    return {
      inputUsdPerMillion: 0.15,
      outputUsdPerMillion: 0.6
    };
  }

  if (normalizedModel.startsWith("gpt-4o")) {
    return {
      inputUsdPerMillion: 2.5,
      outputUsdPerMillion: 10
    };
  }

  /*
    Unknown models deliberately return zero unless
    explicit environment rates are configured.
    This avoids silently reporting an incorrect cost.
  */
  return {
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0
  };
}

function getTranscriptionRates(
  model: string
): TranscriptionRates {
  const environmentInput =
    getOptionalEnvironmentNumber(
      "OPENAI_TRANSCRIPTION_INPUT_USD_PER_MILLION"
    );

  const environmentOutput =
    getOptionalEnvironmentNumber(
      "OPENAI_TRANSCRIPTION_OUTPUT_USD_PER_MILLION"
    );

  const environmentMinute =
    getOptionalEnvironmentNumber(
      "OPENAI_TRANSCRIPTION_USD_PER_MINUTE"
    );

  if (
    environmentInput !== null &&
    environmentOutput !== null
  ) {
    return {
      inputUsdPerMillion: environmentInput,
      outputUsdPerMillion: environmentOutput,
      estimatedUsdPerMinute:
        environmentMinute ?? 0
    };
  }

  const normalizedModel = model.toLowerCase();

  if (
    normalizedModel.startsWith(
      "gpt-4o-mini-transcribe"
    )
  ) {
    return {
      inputUsdPerMillion: 1.25,
      outputUsdPerMillion: 5,
      estimatedUsdPerMinute: 0.003
    };
  }

  if (
    normalizedModel.startsWith(
      "gpt-4o-transcribe"
    )
  ) {
    return {
      inputUsdPerMillion: 2.5,
      outputUsdPerMillion: 10,
      estimatedUsdPerMinute: 0.006
    };
  }

  return {
    inputUsdPerMillion: 0,
    outputUsdPerMillion: 0,
    estimatedUsdPerMinute:
      environmentMinute ?? 0
  };
}

export function calculateAnalysisCostUsd({
  model,
  inputTokens,
  outputTokens
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const rates = getAnalysisRates(model);

  const inputCost =
    (safeNumber(inputTokens) / 1_000_000) *
    rates.inputUsdPerMillion;

  const outputCost =
    (safeNumber(outputTokens) / 1_000_000) *
    rates.outputUsdPerMillion;

  return Number(
    (inputCost + outputCost).toFixed(8)
  );
}

export function calculateTranscriptionCostUsd({
  model,
  inputTokens,
  outputTokens,
  audioSeconds
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  audioSeconds: number;
}) {
  const rates = getTranscriptionRates(model);

  if (
    safeNumber(inputTokens) > 0 ||
    safeNumber(outputTokens) > 0
  ) {
    const inputCost =
      (safeNumber(inputTokens) / 1_000_000) *
      rates.inputUsdPerMillion;

    const outputCost =
      (safeNumber(outputTokens) / 1_000_000) *
      rates.outputUsdPerMillion;

    return Number(
      (inputCost + outputCost).toFixed(8)
    );
  }

  if (
    safeNumber(audioSeconds) > 0 &&
    rates.estimatedUsdPerMinute > 0
  ) {
    const durationCost =
      (safeNumber(audioSeconds) / 60) *
      rates.estimatedUsdPerMinute;

    return Number(durationCost.toFixed(8));
  }

  return 0;
}

export async function recordOwnerApiUsage(
  input: RecordOwnerApiUsageInput
): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();

    const inputTokens = Math.round(
      safeNumber(input.inputTokens)
    );

    const outputTokens = Math.round(
      safeNumber(input.outputTokens)
    );

    const suppliedTotalTokens = Math.round(
      safeNumber(input.totalTokens)
    );

    const totalTokens =
      suppliedTotalTokens > 0
        ? suppliedTotalTokens
        : inputTokens + outputTokens;

    const { data, error } = await admin
      .from("owner_api_usage")
      .insert({
        user_id: input.userId || null,
        meeting_id: input.meetingId || null,
        provider: input.provider || "openai",
        service: input.service,
        operation: input.operation,
        model: input.model || null,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        audio_seconds: safeNumber(
          input.audioSeconds
        ),
        file_size_bytes: Math.round(
          safeNumber(input.fileSizeBytes)
        ),
        estimated_cost_usd: safeNumber(
          input.estimatedCostUsd
        ),
        status: input.status,
        metadata: input.metadata || {},
        occurred_at:
          input.occurredAt ||
          new Date().toISOString()
      })
      .select("id")
      .single();

    if (error) {
      console.error(
        "Unable to save Owner API usage:",
        error
      );

      return null;
    }

    return data?.id ? String(data.id) : null;
  } catch (error) {
    /*
      AI processing must continue even when usage
      logging is temporarily unavailable.
    */
    console.error(
      "Owner API usage logger failed:",
      error
    );

    return null;
  }
}

export async function attachOwnerApiUsageToMeeting(
  usageRecordIds: Array<
    string | null | undefined
  >,
  meetingId: string | null
) {
  const ids = usageRecordIds.filter(
    (value): value is string =>
      typeof value === "string" &&
      value.length > 0
  );

  if (!meetingId || ids.length === 0) {
    return;
  }

  try {
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("owner_api_usage")
      .update({
        meeting_id: meetingId
      })
      .in("id", ids);

    if (error) {
      console.error(
        "Unable to attach API usage to meeting:",
        error
      );
    }
  } catch (error) {
    console.error(
      "API usage meeting attachment failed:",
      error
    );
  }
}
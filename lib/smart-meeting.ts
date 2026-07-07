export type SmartMeetingResult = {
  summary: string;
  actionItems: string[];
  followUp: string;
  proposalPoints: string[];
  temperature: "Hot" | "Warm" | "Cold";
  score: number;
  stage: string;
  nextBestAction: string;
  whatsappMessage: string;
  emailMessage: string;
  automationPlan: string[];
  missingInfo: string[];
  dealSignals: string[];
  riskSignals: string[];
};

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);
}

function hasAny(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword));
}

function findMatchingLines(sentences: string[], keywords: string[]) {
  return sentences.filter((sentence) => hasAny(sentence, keywords));
}

function firstOrDefault(lines: string[], fallback: string) {
  return lines.length > 0 ? lines[0] : fallback;
}

function buildScore(notes: string) {
  let score = 25;
  const dealSignals: string[] = [];
  const riskSignals: string[] = [];

  if (hasAny(notes, ["budget", "price", "cost", "aed", "usd", "pkr", "$", "payment"])) {
    score += 18;
    dealSignals.push("Budget or pricing was discussed.");
  } else {
    riskSignals.push("Budget is not clearly confirmed.");
  }

  if (hasAny(notes, ["today", "tomorrow", "urgent", "asap", "deadline", "this week"])) {
    score += 18;
    dealSignals.push("Client has urgency or a clear timeline.");
  }

  if (hasAny(notes, ["proposal", "quote", "send", "estimate"])) {
    score += 16;
    dealSignals.push("Client is ready for proposal or quote.");
  }

  if (hasAny(notes, ["whatsapp", "call", "email", "follow up", "meeting"])) {
    score += 10;
    dealSignals.push("Follow-up channel was mentioned.");
  }

  if (hasAny(notes, ["not sure", "maybe", "later", "expensive", "cheap", "think about"])) {
    score -= 12;
    riskSignals.push("Client may still be unsure or price-sensitive.");
  }

  score = Math.max(0, Math.min(100, score));

  return { score, dealSignals, riskSignals };
}

function getTemperature(score: number): "Hot" | "Warm" | "Cold" {
  if (score >= 70) return "Hot";
  if (score >= 45) return "Warm";
  return "Cold";
}

function getStage(score: number) {
  if (score >= 70) return "Proposal Ready";
  if (score >= 45) return "Needs Follow-Up";
  return "Nurture Lead";
}

export function createSmartMeetingResult(title: string, notes: string): SmartMeetingResult {
  const cleanNotes = cleanText(notes);
  const lowerNotes = cleanNotes.toLowerCase();
  const sentences = getSentences(notes);

  const needLines = findMatchingLines(sentences, [
    "need",
    "want",
    "looking for",
    "require",
    "problem",
    "issue",
    "help",
    "goal"
  ]);

  const budgetLines = findMatchingLines(sentences, [
    "budget",
    "price",
    "cost",
    "aed",
    "usd",
    "pkr",
    "$",
    "payment",
    "monthly",
    "month"
  ]);

  const timelineLines = findMatchingLines(sentences, [
    "today",
    "tomorrow",
    "urgent",
    "asap",
    "week",
    "month",
    "deadline",
    "start",
    "launch"
  ]);

  const followUpLines = findMatchingLines(sentences, [
    "follow",
    "call",
    "message",
    "whatsapp",
    "email",
    "send",
    "proposal",
    "meeting"
  ]);

  const clientNeed = firstOrDefault(
    needLines,
    sentences[0] || "Client discussed their requirements and next steps."
  );

  const budget = firstOrDefault(
    budgetLines,
    "Budget was not clearly confirmed in the notes."
  );

  const timeline = firstOrDefault(
    timelineLines,
    "Timeline was not clearly confirmed in the notes."
  );

  const followUp = firstOrDefault(
    followUpLines,
    "Follow up with the client and confirm requirements, budget, and timeline."
  );

  const scoring = buildScore(lowerNotes);
  const temperature = getTemperature(scoring.score);
  const stage = getStage(scoring.score);

  const missingInfo: string[] = [];

  if (!hasAny(lowerNotes, ["budget", "price", "cost", "aed", "usd", "pkr", "$"])) {
    missingInfo.push("Confirm budget or expected pricing range.");
  }

  if (!hasAny(lowerNotes, ["today", "tomorrow", "week", "month", "deadline", "start", "launch"])) {
    missingInfo.push("Confirm project start date or deadline.");
  }

  if (!hasAny(lowerNotes, ["whatsapp", "email", "call", "message"])) {
    missingInfo.push("Confirm preferred follow-up channel.");
  }

  if (!hasAny(lowerNotes, ["deliverable", "service", "package", "plan", "scope"])) {
    missingInfo.push("Confirm exact deliverables or service scope.");
  }

  const nextBestAction =
    temperature === "Hot"
      ? "Send a proposal today and follow up within 24 hours."
      : temperature === "Warm"
        ? "Send a short recap and ask for missing details before preparing proposal."
        : "Send a value-based follow-up and nurture the lead before selling.";

  const whatsappMessage = `Hi, thanks for the meeting. I have noted your requirements: ${clientNeed}. I will prepare the next steps/proposal based on this. Please confirm if the budget and timeline details are correct so I can move forward.`;

  const emailMessage = [
    "Subject: Meeting recap and next steps",
    "",
    "Hi,",
    "",
    "Thank you for the meeting. Here is a quick recap:",
    "",
    `Requirement: ${clientNeed}`,
    `Budget/Pricing: ${budget}`,
    `Timeline: ${timeline}`,
    "",
    "Next step:",
    nextBestAction,
    "",
    "Best regards"
  ].join("\n");

  const summary = [
    `Meeting: ${title || "Client Meeting"}`,
    "",
    `Lead temperature: ${temperature}`,
    `Deal score: ${scoring.score}/100`,
    `Suggested stage: ${stage}`,
    "",
    `Client need: ${clientNeed}`,
    `Budget/pricing: ${budget}`,
    `Timeline: ${timeline}`,
    "",
    `Next best action: ${nextBestAction}`,
    "",
    `Smart summary: ${cleanNotes.length > 650 ? `${cleanNotes.slice(0, 650)}...` : cleanNotes}`
  ].join("\n");

  const actionItems = [
    nextBestAction,
    "Confirm any missing budget, timeline, or scope details.",
    "Prepare proposal with deliverables, timeline, and pricing.",
    "Send WhatsApp or email follow-up.",
    "Move the lead to the correct pipeline stage."
  ];

  const proposalPoints = [
    "Client requirements and business goals",
    "Recommended solution and deliverables",
    "Project timeline or monthly workflow",
    "Pricing and payment terms",
    "Next steps and follow-up plan"
  ];

  const automationPlan = [
    "Now: Save meeting summary and lead score.",
    "Today: Send WhatsApp or email recap.",
    "Next 24 hours: Send proposal if lead is warm or hot.",
    "After proposal: Follow up and move pipeline stage.",
    "If no reply: Send reminder message after 2 days."
  ];

  return {
    summary,
    actionItems,
    followUp,
    proposalPoints,
    temperature,
    score: scoring.score,
    stage,
    nextBestAction,
    whatsappMessage,
    emailMessage,
    automationPlan,
    missingInfo,
    dealSignals: scoring.dealSignals,
    riskSignals: scoring.riskSignals
  };
}
export type SmartMeetingResult = {
  summary: string;
  actionItems: string[];
  followUp: string;
  proposalPoints: string[];
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

function findMatchingLines(sentences: string[], keywords: string[]) {
  return sentences.filter((sentence) => {
    const lower = sentence.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword));
  });
}

function firstOrDefault(lines: string[], fallback: string) {
  return lines.length > 0 ? lines[0] : fallback;
}

export function createSmartMeetingResult(title: string, notes: string): SmartMeetingResult {
  const cleanNotes = cleanText(notes);
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

  const summary = [
    `Meeting: ${title || "Client Meeting"}`,
    "",
    `Client need: ${clientNeed}`,
    `Budget/pricing: ${budget}`,
    `Timeline: ${timeline}`,
    "",
    `Smart summary: ${cleanNotes.length > 650 ? `${cleanNotes.slice(0, 650)}...` : cleanNotes}`
  ].join("\n");

  const actionItems = [
    "Confirm the client's main requirements.",
    "Prepare a clear proposal with deliverables, timeline, and pricing.",
    "Send the proposal to the client.",
    "Schedule or send a follow-up message.",
    "Move the client to the correct pipeline stage."
  ];

  const proposalPoints = [
    "Client requirements and business goals",
    "Recommended solution and deliverables",
    "Project timeline or monthly workflow",
    "Pricing and payment terms",
    "Next steps and follow-up plan"
  ];

  return {
    summary,
    actionItems,
    followUp,
    proposalPoints
  };
}
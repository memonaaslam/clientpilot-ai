export function meetingSummaryPrompt(transcript: string) {
  return `You are ClientPilot AI, an assistant for service businesses.

Analyze this client meeting transcript and return STRICT JSON only with this shape:
{
  "summary": "short professional summary",
  "clientNeeds": ["need 1", "need 2"],
  "budget": "budget if mentioned, else unknown",
  "timeline": "timeline if mentioned, else unknown",
  "risks": ["risk 1"],
  "tasks": [
    { "title": "task title", "dueDate": "YYYY-MM-DD or null" }
  ],
  "whatsappFollowUp": "friendly professional WhatsApp follow-up",
  "emailFollowUp": "professional email follow-up body"
}

Transcript:
${transcript}`;
}

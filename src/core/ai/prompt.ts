export interface ClassificationPrompt {
  system: string;
  user: string;
}

export function buildClassificationPrompt(
  filterDescription: string,
  emails: Array<{
    id: string;
    subject: string;
    sender: { name?: string; email: string };
    snippet: string;
  }>
): ClassificationPrompt {
  const systemPrompt = `You are an email classification assistant. Your task is to evaluate emails against a user's filter description and determine which emails match.

For each email, analyze:
1. Subject line relevance
2. Sender information relevance  
3. Content snippet relevance

Return a JSON array where each element has this structure:
{
  "emailId": "the email id",
  "matches": true/false,
  "confidence": 0.0-1.0 (how confident you are in the match),
  "reasoning": "brief explanation of why it matches or doesn't match"
}

Confidence levels:
- 0.8-1.0: High confidence (clear match)
- 0.5-0.79: Medium confidence (probable match)
- 0.0-0.49: Low confidence (unlikely match)`;

  const emailList = emails.map((email) => ({
    id: email.id,
    subject: email.subject,
    sender: email.sender.name ? `${email.sender.name} <${email.sender.email}>` : email.sender.email,
    snippet: email.snippet,
  }));

  const userPrompt = `Filter description: "${filterDescription}"

Emails to evaluate:
${JSON.stringify(emailList, null, 2)}

Return only the JSON array of classifications.`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}

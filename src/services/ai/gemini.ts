import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig, SummarizeEmailRequest, SummarizeEmailResponse } from './provider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildClassificationPrompt, buildSummaryPrompt } from './prompt';

export class GeminiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(private config: AiProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    const model = this.genAI.getGenerativeModel({ model: this.config.model });
    const prompt = buildSummaryPrompt(request.content);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Extract JSON from response
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      const parsed = JSON.parse(jsonStr);
      
      // Inject emailId and createdAt to the returned summary
      return {
        summary: {
          ...parsed.summary,
          emailId: request.emailId,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${text}`);
    }
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    const model = this.genAI.getGenerativeModel({ model: this.config.model });
    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Extract JSON from response (handling potential markdown formatting)
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      return JSON.parse(jsonStr) as ClassifyEmailsResponse;
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${text}`);
    }
  }
}

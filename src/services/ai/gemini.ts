import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig, SummarizeEmailRequest, SummarizeEmailResponse } from './provider';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildClassificationPrompt, buildSummaryPrompt } from './prompt';

export class GeminiProvider implements AiProvider {
  private genAI: GoogleGenerativeAI;

  constructor(private config: AiProviderConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    const model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const prompt = buildSummaryPrompt(request.content);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const parsed = JSON.parse(text);
      
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
    const model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      return JSON.parse(text) as ClassifyEmailsResponse;
    } catch (error) {
      throw new Error(`Failed to parse AI response as JSON: ${text}`);
    }
  }
}

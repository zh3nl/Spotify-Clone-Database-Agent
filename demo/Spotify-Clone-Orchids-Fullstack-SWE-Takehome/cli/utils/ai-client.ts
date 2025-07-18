import { Logger } from './logger';

export interface AIProvider {
  name: string;
  apiKey: string;
  baseUrl?: string;
}

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIClient {
  private logger: Logger;
  private providers: Map<string, AIProvider>;
  private currentProvider: string;

  constructor() {
    this.logger = new Logger();
    this.providers = new Map();
    this.currentProvider = process.env.DB_AGENT_DEFAULT_PROVIDER || 'anthropic'; // Default provider
    
    // Initialize providers from environment variables
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.providers.set('openai', {
        name: 'OpenAI',
        apiKey: openaiKey,
        baseUrl: 'https://api.openai.com/v1'
      });
    }

    // Anthropic
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      this.providers.set('anthropic', {
        name: 'Anthropic',
        apiKey: anthropicKey,
        baseUrl: 'https://api.anthropic.com/v1'
      });
    }

    // Google/Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      this.providers.set('gemini', {
        name: 'Google Gemini',
        apiKey: geminiKey,
        baseUrl: 'https://generativelanguage.googleapis.com/v1'
      });
    }

    if (this.providers.size === 0) {
      this.logger.warn('No AI providers configured. Please set API keys in environment variables.');
      this.logger.info('Supported providers: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY');
    }
  }

  // Set the current provider
  setProvider(providerName: string): void {
    if (this.providers.has(providerName)) {
      this.currentProvider = providerName;
      this.logger.info(`Switched to AI provider: ${this.providers.get(providerName)?.name}`);
    } else {
      throw new Error(`Provider ${providerName} not available`);
    }
  }

  // Get available providers
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // Generate text using the current provider
  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider) {
      throw new Error(`No AI provider configured for ${this.currentProvider}`);
    }

    this.logger.info(`Generating response using ${provider.name}...`);

    try {
      switch (this.currentProvider) {
        case 'openai':
          return await this.generateOpenAI(systemPrompt, userPrompt, provider);
        case 'anthropic':
          return await this.generateAnthropic(systemPrompt, userPrompt, provider);
        case 'gemini':
          return await this.generateGemini(systemPrompt, userPrompt, provider);
        default:
          throw new Error(`Unsupported provider: ${this.currentProvider}`);
      }
    } catch (error) {
      this.logger.error(`AI generation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async generateOpenAI(systemPrompt: string, userPrompt: string, provider: AIProvider): Promise<string> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 4000,
        // Encourage more structured output
        top_p: 0.9
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async generateAnthropic(systemPrompt: string, userPrompt: string, provider: AIProvider): Promise<string> {
    // Ordered list of models to try (most capable to most reliable)
    const modelFallbacks = [
      'claude-3-7-sonnet-20250219',     // Latest, may be overloaded
      'claude-3-5-sonnet-20241022',     // Very reliable and fast
      'claude-3-5-haiku-20241022'       // Most reliable fallback
    ];

    let lastError: Error | null = null;

    for (let modelIndex = 0; modelIndex < modelFallbacks.length; modelIndex++) {
      const model = modelFallbacks[modelIndex];
      
      try {
        this.logger.info(`Attempting to use ${model}...`);
        
        const result = await this.tryAnthropicModel(systemPrompt, userPrompt, provider, model);
        
        if (modelIndex > 0) {
          this.logger.warn(`Successfully used fallback model: ${model}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check if it's an overloaded error
        if (errorMessage.includes('overloaded_error') || errorMessage.includes('Overloaded')) {
          this.logger.warn(`${model} is overloaded, trying fallback...`);
          
          // If not the last model, continue to fallback
          if (modelIndex < modelFallbacks.length - 1) {
            continue;
          }
        } else {
          // For non-overload errors, try with retry logic
          const retryResult = await this.retryAnthropicRequest(systemPrompt, userPrompt, provider, model);
          if (retryResult) {
            return retryResult;
          }
        }
      }
    }

    // If all models failed, throw the last error
    throw new Error(`All Anthropic models failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  private async tryAnthropicModel(systemPrompt: string, userPrompt: string, provider: AIProvider, model: string): Promise<string> {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        // Encourage more structured output
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Anthropic API error: ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Anthropic API');
    }
    
    return data.content[0].text;
  }

  private async retryAnthropicRequest(systemPrompt: string, userPrompt: string, provider: AIProvider, model: string): Promise<string | null> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.info(`Retrying ${model} in ${delay/1000}s (attempt ${attempt}/${maxRetries})...`);
        
        await this.sleep(delay);
        
        return await this.tryAnthropicModel(systemPrompt, userPrompt, provider, model);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (attempt === maxRetries) {
          this.logger.error(`Final retry failed for ${model}: ${errorMessage}`);
          return null;
        }
        
        this.logger.warn(`Retry ${attempt} failed for ${model}: ${errorMessage}`);
      }
    }
    
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async generateGemini(systemPrompt: string, userPrompt: string, provider: AIProvider): Promise<string> {
    const response = await fetch(`${provider.baseUrl}/models/gemini-pro:generateContent?key=${provider.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser request: ${userPrompt}`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  // Stream text generation (for future use)
  async streamText(systemPrompt: string, userPrompt: string, onChunk: (chunk: string) => void): Promise<void> {
    // This would implement streaming for real-time updates
    // For now, just call generateText and pass the whole result
    const result = await this.generateText(systemPrompt, userPrompt);
    onChunk(result);
  }

  // Validate API keys
  async validateProvider(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return false;
    }

    try {
      // Test the API with a simple request
      await this.generateText('You are a helpful assistant.', 'Say hello');
      return true;
    } catch (error) {
      this.logger.error(`Provider validation failed for ${provider.name}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  // Get current provider info
  getCurrentProvider(): AIProvider | null {
    return this.providers.get(this.currentProvider) || null;
  }

  // Helper method to format prompts
  formatPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template;
    for (const [key, value] of Object.entries(variables)) {
      formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return formatted;
  }
} 
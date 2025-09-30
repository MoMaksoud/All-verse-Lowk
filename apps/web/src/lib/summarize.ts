import { Message } from '@/types/chat';

export interface SummarizationService {
  summarize(messages: Message[]): Promise<string>;
}

/**
 * Placeholder summarization service that creates a deterministic summary
 * TODO: Replace with real LLM service (OpenAI, Anthropic, etc.)
 */
class PlaceholderSummarizationService implements SummarizationService {
  async summarize(messages: Message[]): Promise<string> {
    if (messages.length === 0) {
      return '';
    }

    // Extract all user messages for summarization
    const userMessages = messages
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join(' ');

    // Create a simple summary by taking key phrases
    const words = userMessages.toLowerCase().split(/\s+/);
    const wordCount: { [key: string]: number } = {};
    
    // Count word frequency (excluding common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !stopWords.has(cleanWord)) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });

    // Get top 5 most frequent words
    const topWords = Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Create summary from first message and top words
    const firstMessage = messages.find(msg => msg.role === 'user')?.content || '';
    const summary = `Discussion about ${topWords.join(', ')}. ${firstMessage.slice(0, 200)}...`;
    
    return summary.slice(0, 1000); // Limit to 1000 characters
  }
}

/**
 * Real LLM summarization service (to be implemented)
 * TODO: Implement with OpenAI, Anthropic, or other LLM provider
 */
class LLMSummarizationService implements SummarizationService {
  async summarize(messages: Message[]): Promise<string> {
    // TODO: Implement real LLM summarization
    // Example with OpenAI:
    // const response = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [
    //     { role: "system", content: "Summarize this conversation in 2-3 sentences." },
    //     { role: "user", content: messages.map(m => `${m.role}: ${m.content}`).join('\n') }
    //   ],
    //   max_tokens: 200
    // });
    // return response.choices[0].message.content || '';
    
    throw new Error('LLM summarization not implemented yet');
  }
}

// Export the service to use
export const summarizationService: SummarizationService = new PlaceholderSummarizationService();

// Function to switch to LLM service when ready
export const useLLMSummarization = () => {
  return new LLMSummarizationService();
};

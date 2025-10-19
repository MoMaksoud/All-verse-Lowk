/**
 * Embedding service for semantic search
 * TODO: Replace with real embedding service (OpenAI, Cohere, etc.)
 */

export interface EmbeddingService {
  computeEmbedding(text: string): Promise<number[]>;
  computeSimilarity(embedding1: number[], embedding2: number[]): number;
}

/**
 * Placeholder embedding service that creates deterministic vectors
 * Uses a simple hash-based approach for consistent results
 */
class PlaceholderEmbeddingService implements EmbeddingService {
  private readonly embeddingSize = 384; // Standard embedding size

  async computeEmbedding(text: string): Promise<number[]> {
    // Create a deterministic embedding based on text hash
    const hash = this.simpleHash(text);
    const embedding: number[] = [];
    
    for (let i = 0; i < this.embeddingSize; i++) {
      // Use hash with different seeds to create vector
      const seed = hash + i * 2654435761; // Large prime
      const value = Math.sin(seed) * 0.5 + 0.5; // Normalize to [0, 1]
      embedding.push(value);
    }
    
    // Normalize the vector
    return this.normalizeVector(embedding);
  }

  computeSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }
    
    // Compute cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }
}

// Export the service to use
export const embeddingService: EmbeddingService = new PlaceholderEmbeddingService();

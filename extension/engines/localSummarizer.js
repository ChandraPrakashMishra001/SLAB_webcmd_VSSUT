/**
 * SLAB Local Summarizer Engine
 * 100% Offline Extractive Summarizer
 * Uses sentence saliency ranking, TF-IDF frequency scoring, position weighting (lead bias),
 * and key phrase extraction with zero network calls and zero external dependencies.
 */

import { TokenOptimizer } from './tokenOptimizer.js';

export const LocalSummarizer = {
  // English Stopwords for frequency scoring
  STOPWORDS: new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
    'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has',
    'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her',
    'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
    'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
    'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my',
    'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t',
    'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some',
    'such', 'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re',
    'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were',
    'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which',
    'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would',
    'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
    'yourself', 'yourselves'
  ]),

  /**
   * Split text into clean individual sentences
   */
  splitSentences(text) {
    if (!text) return [];
    // Match standard sentence endings while avoiding abbreviations
    return text
      .replace(/([.?!])\s*(?=[A-Z0-9])/g, '$1|')
      .split('|')
      .map(s => s.trim())
      .filter(s => s.length >= 20 && s.split(' ').length >= 4);
  },

  /**
   * Extract words and calculate frequency distribution
   */
  getWordFrequencies(sentences) {
    const wordFreq = new Map();
    let maxFreq = 0;

    for (const sentence of sentences) {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      for (const word of words) {
        if (word && word.length > 2 && !this.STOPWORDS.has(word)) {
          const count = (wordFreq.get(word) || 0) + 1;
          wordFreq.set(word, count);
          if (count > maxFreq) maxFreq = count;
        }
      }
    }

    // Normalize frequencies to [0, 1]
    const normalized = new Map();
    if (maxFreq > 0) {
      for (const [word, count] of wordFreq.entries()) {
        normalized.set(word, count / maxFreq);
      }
    }
    return normalized;
  },

  /**
   * Score sentences based on word frequency, title relevance, length, and position
   */
  scoreSentences(sentences, title = '') {
    const wordFreq = this.getWordFrequencies(sentences);
    const titleWords = new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/));
    const scored = [];

    const totalSentences = sentences.length;

    sentences.forEach((sentence, index) => {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      let sentenceScore = 0;
      let matchedSignificantWords = 0;

      for (const word of words) {
        if (wordFreq.has(word)) {
          sentenceScore += wordFreq.get(word);
          matchedSignificantWords++;
        }
        // Boost if sentence mentions words in the page title
        if (titleWords.has(word) && !this.STOPWORDS.has(word)) {
          sentenceScore += 0.6;
        }
      }

      // Normalization by sentence length (penalize overly short or run-on sentences)
      const wordCount = words.length;
      if (wordCount >= 8 && wordCount <= 35) {
        sentenceScore *= 1.2;
      }

      // Position weighting (lead bias: first 20% and last 10% of article are often most salient)
      const positionRatio = index / Math.max(1, totalSentences);
      if (positionRatio < 0.2) {
        sentenceScore *= 1.4; // Strong lead bias
      } else if (positionRatio > 0.85) {
        sentenceScore *= 1.15; // Conclusion bias
      }

      scored.push({
        index,
        sentence,
        score: sentenceScore
      });
    });

    return scored;
  },

  /**
   * Main Summarize entrypoint
   */
  summarize(rawText, title = '', options = { maxSentences: 4, tokenBudget: 350 }) {
    const cleanedText = TokenOptimizer.cleanText(rawText);
    const sentences = this.splitSentences(cleanedText);

    if (sentences.length <= options.maxSentences) {
      const resultText = sentences.join(' ');
      const savings = TokenOptimizer.calculateSavings(rawText, resultText);
      return {
        summary: resultText,
        bulletPoints: sentences,
        savings,
        isOffline: true
      };
    }

    const scored = this.scoreSentences(sentences, title);

    // Select top N highest scoring sentences
    const topScored = [...scored]
      .sort((a, b) => b.score - a.score)
      .slice(0, options.maxSentences);

    // Re-order by original chronological flow in document
    topScored.sort((a, b) => a.index - b.index);

    const bulletPoints = topScored.map(item => item.sentence);
    const summaryText = bulletPoints.join(' ');
    const budgetedSummary = TokenOptimizer.budgetTokens(summaryText, options.tokenBudget);
    const savings = TokenOptimizer.calculateSavings(rawText, budgetedSummary);

    return {
      summary: budgetedSummary,
      bulletPoints,
      savings,
      isOffline: true
    };
  }
};

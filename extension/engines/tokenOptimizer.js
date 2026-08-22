/**
 * SLAB Token Optimizer Engine
 * Strips boilerplate, deduplicates text, applies token budgeting,
 * and calculates exact token reduction percentages for deterministic efficiency.
 */

export const TokenOptimizer = {
  // Approximate 1 token = ~4 characters for English text
  CHARS_PER_TOKEN: 4,

  // Common web boilerplate patterns to strip
  BOILERPLATE_PATTERNS: [
    /cookie[s]?\s+policy|accept\s+all\s+cookies|we\s+use\s+cookies/gi,
    /all\s+rights\s+reserved|copyright\s+©?\s*\d{4}/gi,
    /terms\s+of\s+service|privacy\s+policy|legal\s+notice/gi,
    /subscribe\s+to\s+our\s+newsletter|sign\s+up\s+for\s+updates/gi,
    /share\s+on\s+facebook|share\s+on\s+twitter|follow\s+us\s+on/gi,
    /skip\s+to\s+content|back\s+to\s+top/gi
  ],

  /**
   * Estimate token count from string length
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.trim().length / this.CHARS_PER_TOKEN);
  },

  /**
   * Clean and normalize raw extracted web text
   */
  cleanText(rawText) {
    if (!rawText) return '';
    let text = rawText;

    // 1. Remove common web noise and boilerplate
    for (const pattern of this.BOILERPLATE_PATTERNS) {
      text = text.replace(pattern, '');
    }

    // 2. Normalize whitespace, remove repeated symbols and empty lines
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    // 3. Deduplicate consecutive identical lines (e.g. repeated nav breadcrumbs)
    const lines = text.split('\n');
    const uniqueLines = [];
    let prevLine = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && trimmed !== prevLine) {
        uniqueLines.push(line);
        prevLine = trimmed;
      }
    }

    return uniqueLines.join('\n');
  },

  /**
   * Truncate text strictly within a maximum token budget
   */
  budgetTokens(text, maxTokens = 1200) {
    const cleaned = this.cleanText(text);
    const maxChars = maxTokens * this.CHARS_PER_TOKEN;

    if (cleaned.length <= maxChars) {
      return cleaned;
    }

    // Truncate at nearest sentence or word boundary
    let truncated = cleaned.slice(0, maxChars);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > maxChars * 0.7) {
      truncated = truncated.slice(0, lastPeriod + 1);
    } else {
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
    }

    return truncated + ' ...';
  },

  /**
   * Calculate exact token savings comparing raw extracted DOM text with optimized output
   */
  calculateSavings(rawText, optimizedText) {
    const rawTokens = this.estimateTokens(rawText);
    const optTokens = this.estimateTokens(optimizedText);
    const savedTokens = Math.max(0, rawTokens - optTokens);
    const percentage = rawTokens > 0 ? Math.round((savedTokens / rawTokens) * 100) : 0;

    return {
      rawTokens,
      optimizedTokens: optTokens,
      savedTokens,
      percentage: Math.min(99, Math.max(0, percentage)),
      tag: `${percentage}% Token Reduction (${optTokens} tokens vs ${rawTokens} raw)`
    };
  }
};

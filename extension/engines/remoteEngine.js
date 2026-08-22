/**
 * SLAB Remote Engine Adapter
 * Connects to Webcmd CLI serverless backend or OpenAI/Supabase Edge functions.
 * Features cleanly exposed `buildRequest` and `parseResponse` adapters
 * and automatic fallback to LocalSummarizer on network timeout or disconnect.
 */

import { TokenOptimizer } from './tokenOptimizer.js';
import { LocalSummarizer } from './localSummarizer.js';

export const RemoteEngine = {
  DEFAULT_ENDPOINT: 'https://slab-webcmd-vssut.vercel.app/api/execute',
  TIMEOUT_MS: 8000,

  /**
   * Build JSON payload for the remote Webcmd / AI backend
   */
  buildRequest(prompt, pageContext = null, settings = {}) {
    const rawContent = pageContext ? pageContext.text || '' : '';
    // Pre-optimize and budget tokens before sending across the wire to maximize token reduction
    const optimizedContent = TokenOptimizer.budgetTokens(rawContent, settings.tokenBudget || 1000);

    return {
      command: prompt,
      context: {
        title: pageContext?.title || '',
        url: pageContext?.url || '',
        content: optimizedContent,
        tokenEstimate: TokenOptimizer.estimateTokens(optimizedContent)
      },
      options: {
        model: settings.model || 'gemini-3.5-flash',
        stream: false,
        format: 'json'
      }
    };
  },

  /**
   * Parse structured response from the remote Webcmd / AI backend
   */
  parseResponse(json, rawContent = '') {
    if (!json) throw new Error('Empty response from remote engine');

    // Handle standard Webcmd / SLAB structured execution schemas
    const text = json.result || json.summary || json.content || json.text || (typeof json === 'string' ? json : JSON.stringify(json, null, 2));
    const commandCard = json.commandCard || json.adapter || null;
    const bulletPoints = json.bulletPoints || (Array.isArray(json.points) ? json.points : []);

    const savings = TokenOptimizer.calculateSavings(rawContent, text);

    return {
      text,
      summary: text,
      bulletPoints,
      commandCard,
      savings,
      isOffline: false,
      raw: json
    };
  },

  /**
   * Execute request with timeout and graceful offline fallback
   */
  async execute(prompt, pageContext = null, settings = {}) {
    const endpoint = settings.remoteEndpoint || this.DEFAULT_ENDPOINT;
    const requestBody = this.buildRequest(prompt, pageContext, settings);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {})
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Remote API returned HTTP ${response.status}`);
      }

      const json = await response.json();
      return this.parseResponse(json, pageContext?.text || '');
    } catch (err) {
      clearTimeout(timer);
      console.warn('[SLAB RemoteEngine] Remote call failed, falling back to LocalSummarizer:', err.message);

      // Fallback seamlessly to offline LocalSummarizer
      if (pageContext && pageContext.text) {
        const localResult = LocalSummarizer.summarize(pageContext.text, pageContext.title);
        return {
          ...localResult,
          text: localResult.summary,
          fallbackNotice: `⚡ Rendered via Offline Local Engine (${err.message})`
        };
      }

      throw err;
    }
  }
};

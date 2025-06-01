/**
 * src/ai-providers/perplexity.js
 *
 * Implementation for interacting with Perplexity models
 * using the Vercel AI SDK.
 */
import { createPerplexity } from '@ai-sdk/perplexity';
import { BaseAIProvider } from './base-provider.js';

export class PerplexityAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'Perplexity';
	}

	/**
	 * Creates and returns a Perplexity client instance.
	 * @param {object} params - Parameters for client initialization
	 * @param {string} params.apiKey - Perplexity API key
	 * @param {string} [params.baseURL] - Optional custom API endpoint
	 * @returns {Function} Perplexity client function
	 * @throws {Error} If required parameters are missing or initialization fails
	 */
	getClient(params) {
		try {
			const { apiKey, baseURL } = params;

			return createPerplexity({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL })
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

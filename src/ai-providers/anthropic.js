/**
 * src/ai-providers/anthropic.js
 *
 * Implementation for interacting with Anthropic models (e.g., Claude)
 * using the Vercel AI SDK.
 */
import { createAnthropic } from '@ai-sdk/anthropic';
import { BaseAIProvider } from './base-provider.js';

export class AnthropicAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'Anthropic';
	}

	/**
	 * Creates and returns an Anthropic client instance.
	 * @param {object} params - Parameters for client initialization
	 * @param {string} params.apiKey - Anthropic API key
	 * @param {string} [params.baseURL] - Optional custom API endpoint
	 * @returns {Function} Anthropic client function
	 * @throws {Error} If required parameters are missing or initialization fails
	 */
	getClient(params) {
		try {
			const { apiKey, baseURL } = params;

			return createAnthropic({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL }),
				// Use standard version header instead of beta
				headers: {
					'anthropic-beta': 'output-128k-2025-02-19'
				}
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}



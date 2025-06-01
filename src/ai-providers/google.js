/**
 * google.js
 * AI provider implementation for Google AI models (e.g., Gemini) using Vercel AI SDK.
 */

import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { BaseAIProvider } from './base-provider.js';

export class GoogleAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'Google';
	}

	/**
	 * Creates and returns a Google AI client instance.
	 * @param {object} params - Parameters for client initialization
	 * @param {string} params.apiKey - Google API key
	 * @param {string} [params.baseURL] - Optional custom API endpoint
	 * @returns {Function} Google AI client function
	 * @throws {Error} If required parameters are missing or initialization fails
	 */
	getClient(params) {
		try {
			const { apiKey, baseURL } = params;

			return createGoogleGenerativeAI({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL })
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

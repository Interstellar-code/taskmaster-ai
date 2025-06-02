import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { BaseAIProvider } from './base-provider.js';

export class OpenRouterAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'OpenRouter';
	}

	getClient(params) {
		try {
			const { apiKey, baseURL } = params;
			return createOpenRouter({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL })
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

import { createOpenAI } from '@ai-sdk/openai';
import { BaseAIProvider } from './base-provider.js';

export class OpenAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'OpenAI';
	}

	getClient(params) {
		try {
			const { apiKey, baseURL } = params;
			return createOpenAI({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL })
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

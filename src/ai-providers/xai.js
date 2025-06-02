import { createXai } from '@ai-sdk/xai';
import { BaseAIProvider } from './base-provider.js';

export class XAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'xAI';
	}

	getClient(params) {
		try {
			const { apiKey, baseURL } = params;
			return createXai({
				apiKey: apiKey,
				...(baseURL && { baseURL: baseURL })
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

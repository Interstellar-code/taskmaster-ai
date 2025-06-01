import { createOllama } from 'ollama-ai-provider';
import { BaseAIProvider } from './base-provider.js';

export class OllamaAIProvider extends BaseAIProvider {
	constructor() {
		super();
		this.name = 'Ollama';
	}

	validateAuth(params) {
		// Ollama doesn't require API key
	}

	getClient(params) {
		try {
			const { baseURL = 'http://localhost:11434' } = params;
			return createOllama({
				baseURL: baseURL
			});
		} catch (error) {
			this.handleError('client initialization', error);
		}
	}
}

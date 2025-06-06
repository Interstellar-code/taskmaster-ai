/**
 * AI Providers Test Suite
 * Tests the new AI provider implementations
 */

import { describe, it } from 'mocha';
import { expect } from 'chai';

describe('AI Providers', function () {
	this.timeout(5000);

	describe('Provider Imports', function () {
		it('should import all providers without errors', async function () {
			const providers = await import('../../src/ai-providers/index.js');

			expect(providers).to.have.property('AnthropicAIProvider');
			expect(providers).to.have.property('PerplexityAIProvider');
			expect(providers).to.have.property('GoogleAIProvider');
			expect(providers).to.have.property('OpenAIProvider');
			expect(providers).to.have.property('XAIProvider');
			expect(providers).to.have.property('OpenRouterAIProvider');
			expect(providers).to.have.property('OllamaAIProvider');
			expect(providers).to.have.property('BedrockAIProvider');
			expect(providers).to.have.property('AzureProvider');
			expect(providers).to.have.property('VertexAIProvider');
		});
	});

	describe('BaseAIProvider', function () {
		it('should not be instantiable directly', async function () {
			const { BaseAIProvider } = await import(
				'../../src/ai-providers/base-provider.js'
			);
			expect(() => new BaseAIProvider()).to.throw();
		});
	});

	describe('Anthropic Provider', function () {
		it('should instantiate correctly', async function () {
			const { AnthropicAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new AnthropicAIProvider();

			expect(provider.name).to.equal('Anthropic');
			expect(provider).to.have.property('getClient');
			expect(provider).to.have.property('generateText');
			expect(provider).to.have.property('streamText');
			expect(provider).to.have.property('generateObject');
		});

		it('should validate parameters correctly', async function () {
			const { AnthropicAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new AnthropicAIProvider();

			// Should throw for missing API key
			expect(() => provider.validateAuth({})).to.throw('API key is required');

			// Should throw for missing model ID
			expect(() => provider.validateParams({ apiKey: 'test' })).to.throw(
				'Model ID is required'
			);
		});
	});

	describe('Bedrock Provider', function () {
		it('should instantiate correctly', async function () {
			const { BedrockAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new BedrockAIProvider();

			expect(provider.name).to.equal('Bedrock');
			expect(provider).to.have.property('getClient');
		});

		it('should not require API key validation', async function () {
			const { BedrockAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new BedrockAIProvider();

			// Should not throw for missing API key (uses AWS credentials)
			expect(() => provider.validateAuth({})).to.not.throw();
		});
	});

	describe('Azure Provider', function () {
		it('should instantiate correctly', async function () {
			const { AzureProvider } = await import('../../src/ai-providers/index.js');
			const provider = new AzureProvider();

			expect(provider.name).to.equal('Azure OpenAI');
			expect(provider).to.have.property('getClient');
		});

		it('should require both API key and base URL', async function () {
			const { AzureProvider } = await import('../../src/ai-providers/index.js');
			const provider = new AzureProvider();

			// Should throw for missing API key
			expect(() => provider.validateAuth({})).to.throw(
				'Azure API key is required'
			);

			// Should throw for missing base URL
			expect(() => provider.validateAuth({ apiKey: 'test' })).to.throw(
				'Azure endpoint URL is required'
			);
		});
	});

	describe('Google Vertex Provider', function () {
		it('should instantiate correctly', async function () {
			const { VertexAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new VertexAIProvider();

			expect(provider.name).to.equal('Google Vertex AI');
			expect(provider).to.have.property('getClient');
		});

		it('should require project ID and location', async function () {
			const { VertexAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new VertexAIProvider();

			// Should throw for missing project ID
			expect(() => provider.validateAuth({ apiKey: 'test' })).to.throw(
				'project ID is required'
			);

			// Should throw for missing location
			expect(() =>
				provider.validateAuth({ apiKey: 'test', projectId: 'test' })
			).to.throw('location is required');
		});
	});

	describe('OpenAI Provider', function () {
		it('should instantiate correctly', async function () {
			const { OpenAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new OpenAIProvider();

			expect(provider.name).to.equal('OpenAI');
			expect(provider).to.have.property('getClient');
		});
	});

	describe('Google Provider', function () {
		it('should instantiate correctly', async function () {
			const { GoogleAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new GoogleAIProvider();

			expect(provider.name).to.equal('Google');
			expect(provider).to.have.property('getClient');
		});
	});

	describe('Perplexity Provider', function () {
		it('should instantiate correctly', async function () {
			const { PerplexityAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new PerplexityAIProvider();

			expect(provider.name).to.equal('Perplexity');
			expect(provider).to.have.property('getClient');
		});
	});

	describe('XAI Provider', function () {
		it('should instantiate correctly', async function () {
			const { XAIProvider } = await import('../../src/ai-providers/index.js');
			const provider = new XAIProvider();

			expect(provider.name).to.equal('xAI');
			expect(provider).to.have.property('getClient');
		});
	});

	describe('OpenRouter Provider', function () {
		it('should instantiate correctly', async function () {
			const { OpenRouterAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new OpenRouterAIProvider();

			expect(provider.name).to.equal('OpenRouter');
			expect(provider).to.have.property('getClient');
		});
	});

	describe('Ollama Provider', function () {
		it('should instantiate correctly', async function () {
			const { OllamaAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new OllamaAIProvider();

			expect(provider.name).to.equal('Ollama');
			expect(provider).to.have.property('getClient');
		});

		it('should not require API key', async function () {
			const { OllamaAIProvider } = await import(
				'../../src/ai-providers/index.js'
			);
			const provider = new OllamaAIProvider();

			// Should not throw for missing API key
			expect(() => provider.validateAuth({})).to.not.throw();
		});
	});
});

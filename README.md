# TaskHero AI - Personal Fork

> **Note**: This is a personal fork of Taskmaster AI with custom modifications.
> [![License: MIT with Commons Clause](https://img.shields.io/badge/license-MIT%20with%20Commons%20Clause-blue.svg)](LICENSE)

[![Twitter Follow](https://img.shields.io/twitter/follow/eyaltoledano?style=flat)](https://x.com/eyaltoledano)
[![Twitter Follow](https://img.shields.io/twitter/follow/RalphEcom?style=flat)](https://x.com/RalphEcom)

A task management system for AI-driven development with Claude, designed to work seamlessly with AI-powered editors like Cursor, Augment, Windsurf, and Roo Code.

This fork includes personal customizations and modifications for enhanced functionality.

## Requirements

TaskHero utilizes AI across several commands, and those require a separate API key. You can use a variety of models from different AI providers provided you add your API keys. For example, if you want to use Claude 3.7, you'll need an Anthropic API key.

You can define 3 types of models to be used: the main model, the research model, and the fallback model (in case either the main or research fail). Whatever model you use, its provider API key must be present in either mcp.json or .env.

At least one (1) of the following is required:

- Anthropic API key (Claude API)
- OpenAI API key
- Google Gemini API key
- Perplexity API key (for research model)
- xAI API Key (for research or main model)
- OpenRouter API Key (for research or main model)

Using the research model is optional but highly recommended. You will need at least ONE API key. Adding all API keys enables you to seamlessly switch between model providers at will.

## Quick Start

### Option 1: Install from npm (Recommended)

Install the published package globally:

```bash
# Install globally from npm
npm install -g task-hero-ai

# Verify installation
task-hero --version
task-hero menu
```

### Option 2: Local Development Installation

For development and customization of this fork:

#### 1. Clone and Install Locally

```bash
# Clone this repository
git clone https://github.com/Interstellar-code/taskmaster-ai.git
cd taskmaster-ai

# Install dependencies
npm install

# Link globally for system-wide access
npm link
```

#### 2. Verify Installation

```bash
# Check version
task-hero --version

# View help
task-hero --help

# Launch interactive menu
task-hero menu

# Or run verification script
node scripts/verify-installation.js
```

#### 3. Uninstalling (if needed)

```bash
# Unlink the global installation
npm unlink

# This removes the global task-hero command
# Your local repository remains unchanged
```

### Option 3: Install from GitHub

Install directly from this repository:

```bash
# Install from main branch
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git

# Install from specific branch
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git#dev_rohit
```

### Option 4: MCP Integration (For AI Editors)

MCP (Model Control Protocol) lets you run TaskHero directly from your editor.

#### 1. Add your MCP config at the following path depending on your editor

| Editor       | Scope   | Linux/macOS Path                      | Windows Path                                      | Key          |
| ------------ | ------- | ------------------------------------- | ------------------------------------------------- | ------------ |
| **Cursor**   | Global  | `~/.cursor/mcp.json`                  | `%USERPROFILE%\.cursor\mcp.json`                  | `mcpServers` |
|              | Project | `<project_folder>/.cursor/mcp.json`   | `<project_folder>\.cursor\mcp.json`               | `mcpServers` |
| **Windsurf** | Global  | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` | `mcpServers` |
| **VS Code**  | Project | `<project_folder>/.vscode/mcp.json`   | `<project_folder>\.vscode\mcp.json`               | `servers`    |

##### Cursor & Windsurf (`mcpServers`)

```jsonc
{
	"mcpServers": {
		"taskhero-ai": {
			"command": "task-hero-mcp",
			"env": {
				"ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE",
				"PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY_HERE",
				"OPENAI_API_KEY": "YOUR_OPENAI_KEY_HERE",
				"GOOGLE_API_KEY": "YOUR_GOOGLE_KEY_HERE",
				"MISTRAL_API_KEY": "YOUR_MISTRAL_KEY_HERE",
				"OPENROUTER_API_KEY": "YOUR_OPENROUTER_KEY_HERE",
				"XAI_API_KEY": "YOUR_XAI_KEY_HERE",
				"AZURE_OPENAI_API_KEY": "YOUR_AZURE_KEY_HERE",
				"OLLAMA_API_KEY": "YOUR_OLLAMA_API_KEY_HERE"
			}
		}
	}
}
```

> 🔑 Replace `YOUR_…_KEY_HERE` with your real API keys. You can remove keys you don't use.

##### VS Code (`servers` + `type`)

```jsonc
{
	"servers": {
		"taskhero-ai": {
			"command": "task-hero-mcp",
			"env": {
				"ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY_HERE",
				"PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY_HERE",
				"OPENAI_API_KEY": "YOUR_OPENAI_KEY_HERE",
				"GOOGLE_API_KEY": "YOUR_GOOGLE_KEY_HERE",
				"MISTRAL_API_KEY": "YOUR_MISTRAL_KEY_HERE",
				"OPENROUTER_API_KEY": "YOUR_OPENROUTER_KEY_HERE",
				"XAI_API_KEY": "YOUR_XAI_KEY_HERE",
				"AZURE_OPENAI_API_KEY": "YOUR_AZURE_KEY_HERE"
			},
			"type": "stdio"
		}
	}
}
```

> 🔑 Replace `YOUR_…_KEY_HERE` with your real API keys. You can remove keys you don't use.

#### 2. (Cursor-only) Enable TaskHero MCP

Open Cursor Settings (Ctrl+Shift+J) ➡ Click on MCP tab on the left ➡ Enable taskhero-ai with the toggle

#### 3. (Optional) Configure the models you want to use

In your editor’s AI chat pane, say:

```txt
Change the main, research and fallback models to <model_name>, <model_name> and <model_name> respectively.
```

[Table of available models](docs/models.md)

#### 4. Initialize TaskHero

In your editor’s AI chat pane, say:

```txt
Initialize taskhero-ai in my project
```

#### 5. Make sure you have a PRD in `<project_folder>/scripts/prd.txt`

An example of a PRD is located into `<project_folder>/scripts/example_prd.txt`.

**Always start with a detailed PRD.**

The more detailed your PRD, the better the generated tasks will be.

#### 6. Common Commands

Use your AI assistant to:

- Parse requirements: `Can you parse my PRD at scripts/prd.txt?`
- Plan next step: `What’s the next task I should work on?`
- Implement a task: `Can you help me implement task 3?`
- Expand a task: `Can you help me expand task 4?`

[More examples on how to use TaskHero in chat](docs/examples.md)

### Option 5: Command Line Usage

After installing locally (Option 1), you can use TaskHero from the command line.

#### Initialize a new project

```bash
task-hero init
```

This will prompt you for project details and set up a new project with the necessary files and structure.

#### AI Editor Integration

TaskHero automatically sets up workspace guidelines and rules for popular AI-powered editors:

- **🤖 Augment AI** - Creates `.augment-guidelines` with TaskHero-specific context
- **🎯 Cursor** - Generates comprehensive `.cursor/rules/` directory
- **🌊 Windsurf** - Sets up `.windsurfrules` for AI assistance
- **🦘 Roo Code** - Creates `.roo/` directory with mode-specific rules

These files help AI assistants understand your project structure and provide more accurate, context-aware suggestions when working with TaskHero projects.

#### Interactive Menu (Recommended)

For the best user experience, use the interactive menu system:

```bash
# Launch interactive menu
task-hero menu

# OR use the shorthand flag
task-hero --menu
task-hero -m
```

The interactive menu provides:

- 🎯 **Guided workflows** - No need to remember command syntax
- 📊 **Real-time project info** - See task counts and status at a glance
- 🧭 **Easy navigation** - Organized categories with breadcrumb navigation
- ✅ **Input validation** - Prevents common mistakes with smart prompts
- 🔄 **Error recovery** - Graceful handling of issues with recovery options
- 📁 **Smart file selection** - Automatically finds and suggests PRD files
- ⚠️ **Append detection** - Automatically uses `--append` when tasks exist

[📖 Complete Interactive Menu Guide](docs/interactive-menu.md)

#### Common Commands

```bash
# Initialize a new project
task-hero init

# Parse a PRD and generate tasks
task-hero parse-prd your-prd.txt

# List all tasks
task-hero list

# Show the next task to work on
task-hero next

# Generate task files
task-hero generate
```

## Documentation

For more detailed information, check out the documentation in the `docs` directory:

- [Installation & Publishing Guide](docs/installation-and-publishing.md) - Complete guide for local installation and npm publishing
- [Interactive Menu Guide](docs/interactive-menu.md) - Complete guide to the menu system
- [Augment AI Integration](docs/augment-integration.md) - Using TaskHero with Augment AI
- [Configuration Guide](docs/configuration.md) - Set up environment variables and customize TaskHero
- [Tutorial](docs/tutorial.md) - Step-by-step guide to getting started with TaskHero
- [Command Reference](docs/command-reference.md) - Complete list of all available commands
- [Task Structure](docs/task-structure.md) - Understanding the task format and features
- [Example Interactions](docs/examples.md) - Common Cursor AI interaction examples

## Publishing Your Fork

If you want to publish your own version of TaskHero AI to npm:

1. **Prepare the package**: `node scripts/prepare-npm-package.js`
2. **Test locally**: `npm pack --dry-run`
3. **Login to npm**: `npm login`
4. **Publish**: `npm publish`

See the [Installation & Publishing Guide](docs/installation-and-publishing.md) for detailed instructions.

## Troubleshooting

### If `task-hero init` doesn't respond:

Try running it with Node directly from your local installation:

```bash
node scripts/init.js
```

### If you need to reinstall:

```bash
# Unlink the current installation
npm unlink

# Reinstall dependencies
npm install

# Link again
npm link
```

## Contributors

<a href="https://github.com/Interstellar-code/taskmaster-ai/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Interstellar-code/taskmaster-ai" alt="TaskHero project contributors" />
</a>

_Original project contributors can be found at [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master/graphs/contributors)_

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Interstellar-code/taskmaster-ai&type=Timeline)](https://www.star-history.com/#Interstellar-code/taskmaster-ai&Timeline)

## Licensing

TaskHero is licensed under the MIT License with Commons Clause. This means you can:

✅ **Allowed**:

- Use TaskHero for any purpose (personal, commercial, academic)
- Modify the code
- Distribute copies
- Create and sell products built using TaskHero

❌ **Not Allowed**:

- Sell TaskHero itself
- Offer TaskHero as a hosted service

See the [LICENSE](LICENSE) file for the complete license text and [licensing details](docs/licensing.md) for more information.

# Git Repository Analyzer

A powerful, production-ready tool for analyzing git repositories to provide deep insights into code evolution, team dynamics, technical debt, and project health.

## Features

- 📊 **Commit Analytics**: Timeline analysis, distribution patterns, and statistics
- 👥 **Author Insights**: Contributor rankings, team velocity, collaboration patterns
- 📁 **Code Metrics**: Lines of code, language distribution, code growth trends
- 🔥 **Hotspot Detection**: Identify frequently changing files and potential tech debt
- 📈 **Beautiful Visualizations**: Interactive charts and graphs (coming soon)
- 🚀 **High Performance**: Handles large repositories efficiently with streaming architecture

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/git-repo-analyzer.git
cd git-repo-analyzer

# Install dependencies
npm install

# Build the project
npm run build
```

### Usage

```bash
# Analyze a local repository
npm run cli -- analyze /path/to/repo

# Analyze the current directory
npm run cli -- analyze .

# Analyze with filters
npm run cli -- analyze /path/to/repo --since="6 months ago" --branch=main

# Get help
npm run cli -- --help
```

## Architecture

This is a monorepo containing multiple packages:

- **`packages/core`**: Core analysis engine with git operations and analyzers
- **`packages/cli`**: Command-line interface for running analyses
- **`packages/web`**: Web dashboard for visualizations (coming soon)
- **`packages/server`**: API server for the web interface (coming soon)

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Clean build artifacts
npm run clean
```

## Technology Stack

- **TypeScript**: Type-safe development
- **Node.js**: Runtime environment
- **simple-git**: Git operations
- **Commander.js**: CLI framework
- **Jest**: Testing framework
- **ESLint + Prettier**: Code quality

## Roadmap

- [x] Phase 1: Foundation (Core + CLI)
- [ ] Phase 2: Advanced Analytics (Code churn, metrics, branches)
- [ ] Phase 3: Visualizations (D3.js charts, interactive dashboards)
- [ ] Phase 4: Web UI (React dashboard)
- [ ] Phase 5: Reports & Exports (PDF, Markdown, JSON)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Author

Built with ❤️ by Claude Code

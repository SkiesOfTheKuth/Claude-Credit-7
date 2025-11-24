# Git Repository Analyzer

A Node.js/TypeScript toolkit for inspecting git repositories from the command line. The project is structured as a npm workspace with:

- **`packages/core`** – repository wrapper, commit/file analyzers, and shared types
- **`packages/cli`** – Commander-based CLI that surfaces the core analysis in either formatted console output or JSON

## What it does

- Validates repositories and reports path, current branch, remotes, and total commits
- Retrieves commit history with optional filters (branch, author, date range, max count)
- Aggregates commit activity (top authors, commits by day/hour, average commits per day)
- Pulls per-commit file change statistics and summarizes hotspots and largest changes
- Presents results as human-friendly tables or machine-readable JSON

## Requirements

- Node.js 18+
- npm 9+

## Installation

```bash
# Install dependencies for all workspaces
npm install

# Build the TypeScript packages
npm run build
```

## CLI usage

After building, run the analyzer with the workspace helper or the packaged binary:

```bash
# Analyze the current repository with default formatting
npm run cli -- analyze .

# Analyze another repository with filters
npm run cli -- analyze /path/to/repo \
  --branch main \
  --since "2024-01-01" \
  --until "2024-06-30" \
  --author "user@example.com" \
  --max-count 500

# Emit structured JSON instead of pretty text
npm run cli -- analyze . --json
```

The CLI streams commits with file statistics, computes commit and file-level metrics, and prints a summary that includes top contributors, peak activity windows, and the most frequently changed files.

## Development scripts

Run these from the repository root:

```bash
# Build all workspaces
npm run build

# Execute tests for available packages
npm test

# Lint and format source files
npm run lint
npm run format

# Clean workspace artifacts
npm run clean
```

## License

MIT License - see LICENSE for details.

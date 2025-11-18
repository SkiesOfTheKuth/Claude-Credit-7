/**
 * @git-analyzer/core
 * Core analysis engine for git repository insights
 */

// Export types
export type {
  Commit,
  Author,
  CommitAnalysis,
  AnalysisOptions,
  RepositoryInfo,
} from './types/index.js';

export { AnalysisErrorType } from './types/index.js';

// Export errors
export {
  AnalysisError,
  InvalidRepositoryError,
  GitOperationError,
  InvalidOptionsError,
  AnalysisFailedError,
} from './utils/errors.js';

// Export main classes
export { Repository } from './git/repository.js';
export { CommitAnalyzer } from './analyzers/commits.js';

// Re-export for convenience
export { Repository as GitRepository } from './git/repository.js';

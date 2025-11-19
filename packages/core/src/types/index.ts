/**
 * Core type definitions for git repository analysis
 */

/**
 * Represents a commit in the repository
 */
export interface Commit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  refs: string;
  body: string;
}

/**
 * Represents an author/contributor
 */
export interface Author {
  name: string;
  email: string;
  commitCount: number;
  firstCommit: Date;
  lastCommit: Date;
}

/**
 * Analysis result for commits
 */
export interface CommitAnalysis {
  totalCommits: number;
  dateRange: {
    earliest: Date;
    latest: Date;
    spanDays: number;
  };
  authors: Author[];
  topAuthors: Author[];
  commitsByDay: Map<string, number>;
  commitsByHour: Map<number, number>;
  averageCommitsPerDay: number;
}

/**
 * Options for repository analysis
 */
export interface AnalysisOptions {
  /** Path to the git repository */
  repoPath: string;
  /** Branch to analyze (default: current branch) */
  branch?: string;
  /** Only analyze commits since this date */
  since?: Date | string;
  /** Only analyze commits until this date */
  until?: Date | string;
  /** Author filter (email or name pattern) */
  author?: string;
  /** Maximum number of commits to analyze */
  maxCount?: number;
}

/**
 * Repository metadata
 */
export interface RepositoryInfo {
  path: string;
  isValid: boolean;
  currentBranch: string;
  remotes: string[];
  totalCommits: number;
}

/**
 * Error types that can occur during analysis
 */
export enum AnalysisErrorType {
  INVALID_REPOSITORY = 'INVALID_REPOSITORY',
  GIT_OPERATION_FAILED = 'GIT_OPERATION_FAILED',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
}

// Re-export file-related types
export type {
  FileChange,
  FileStats,
  FileAnalysis,
  CommitWithFiles,
} from './files.js';

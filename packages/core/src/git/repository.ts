import { simpleGit, SimpleGit, DefaultLogFields, LogResult } from 'simple-git';
import { resolve } from 'path';
import { InvalidRepositoryError, GitOperationError, InvalidOptionsError } from '../utils/errors.js';
import type { Commit, RepositoryInfo, AnalysisOptions, CommitWithFiles, FileChange } from '../types/index.js';

/**
 * Interface for simple-git log response with file statistics
 */
interface GitLogEntryWithFiles {
  hash: string;
  date: string;
  message: string;
  author?: string;
  email?: string;
  refs?: string;
  body?: string;
  diff?: {
    changed: number;
    insertions: number;
    deletions: number;
    files: Array<{
      file: string;
      changes: number;
      insertions: number;
      deletions: number;
      binary: boolean;
    }>;
  };
}

/**
 * Type guard to validate git log entry structure
 */
function isValidGitLogEntry(obj: unknown): obj is GitLogEntryWithFiles {
  if (typeof obj !== 'object' || obj === null) return false;
  const entry = obj as Record<string, unknown>;

  // Validate required fields
  if (typeof entry.hash !== 'string' || entry.hash === '') return false;
  if (typeof entry.date !== 'string' || entry.date === '') return false;
  if (typeof entry.message !== 'string') return false;

  // Validate optional fields if present
  if (entry.author !== undefined && typeof entry.author !== 'string') return false;
  if (entry.email !== undefined && typeof entry.email !== 'string') return false;
  if (entry.refs !== undefined && typeof entry.refs !== 'string') return false;
  if (entry.body !== undefined && typeof entry.body !== 'string') return false;

  // Validate diff structure if present
  if (entry.diff !== undefined) {
    const diff = entry.diff as Record<string, unknown>;
    if (typeof diff.changed !== 'number') return false;
    if (typeof diff.insertions !== 'number') return false;
    if (typeof diff.deletions !== 'number') return false;
    if (!Array.isArray(diff.files)) return false;
  }

  return true;
}

/**
 * Wrapper around simple-git for repository operations
 * Provides a clean interface and proper error handling
 */
export class Repository {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    // Validate input
    if (typeof repoPath !== 'string') {
      throw new InvalidOptionsError('Repository path must be a string');
    }

    const trimmedPath = repoPath.trim();
    if (trimmedPath === '') {
      throw new InvalidOptionsError('Repository path cannot be empty or whitespace');
    }

    if (trimmedPath.length > 4096) {
      throw new InvalidOptionsError('Repository path exceeds maximum length (4096 characters)');
    }

    this.repoPath = resolve(trimmedPath);
    this.git = simpleGit(this.repoPath);
  }

  /**
   * Validates that the path is a git repository
   */
  async isValid(): Promise<boolean> {
    try {
      await this.git.revparse(['--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensures the repository is valid, throws if not
   */
  async ensureValid(): Promise<void> {
    const valid = await this.isValid();
    if (!valid) {
      throw new InvalidRepositoryError(this.repoPath);
    }
  }

  /**
   * Gets basic repository information
   */
  async getInfo(): Promise<RepositoryInfo> {
    await this.ensureValid();

    try {
      const [currentBranch, remotes, totalCommits] = await Promise.all([
        this.getCurrentBranch(),
        this.getRemotes(),
        this.getCommitCount(),
      ]);

      return {
        path: this.repoPath,
        isValid: true,
        currentBranch,
        remotes,
        totalCommits,
      };
    } catch (error) {
      throw new GitOperationError(
        'getInfo',
        'Failed to retrieve repository information',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets the current branch name
   */
  private async getCurrentBranch(): Promise<string> {
    try {
      const status = await this.git.status();
      return status.current || 'HEAD';
    } catch (error) {
      throw new GitOperationError(
        'getCurrentBranch',
        'Failed to get current branch',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets list of remote names
   */
  private async getRemotes(): Promise<string[]> {
    try {
      const remotes = await this.git.getRemotes();
      return remotes.map((r) => r.name);
    } catch (error) {
      throw new GitOperationError(
        'getRemotes',
        'Failed to get remotes',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets total commit count for current branch
   */
  private async getCommitCount(): Promise<number> {
    try {
      const result = await this.git.raw(['rev-list', '--count', 'HEAD']);
      return parseInt(result.trim(), 10);
    } catch (error) {
      // If HEAD doesn't exist (empty repo), return 0
      return 0;
    }
  }

  /**
   * Fetches commits based on analysis options
   * Uses streaming approach for memory efficiency with large repos
   */
  async getCommits(options: Partial<AnalysisOptions> = {}): Promise<Commit[]> {
    await this.ensureValid();

    try {
      const logOptions: Record<string, unknown> = {
        format: {
          hash: '%H',
          author: '%an',
          email: '%ae',
          date: '%ai',
          message: '%s',
          refs: '%D',
          body: '%b',
        },
      };

      // Add filters based on options
      if (options.branch) {
        logOptions.from = options.branch;
      }

      if (options.since) {
        logOptions.after = options.since instanceof Date
          ? options.since.toISOString()
          : options.since;
      }

      if (options.until) {
        logOptions.before = options.until instanceof Date
          ? options.until.toISOString()
          : options.until;
      }

      if (options.author) {
        logOptions.author = options.author;
      }

      if (options.maxCount) {
        logOptions.maxCount = options.maxCount;
      }

      const log: LogResult<DefaultLogFields> = await this.git.log(logOptions);

      // Transform to our Commit type
      return log.all.map((commit) => ({
        hash: commit.hash,
        author: (commit as { author?: string }).author || 'Unknown',
        email: (commit as { email?: string }).email || '',
        date: new Date(commit.date),
        message: commit.message,
        refs: (commit as { refs?: string }).refs || '',
        body: (commit as { body?: string }).body || '',
      }));
    } catch (error) {
      throw new GitOperationError(
        'getCommits',
        'Failed to fetch commits',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fetches commits with file change information
   * Includes statistics about which files were modified and line-level changes
   */
  async getCommitsWithFiles(options: Partial<AnalysisOptions> = {}): Promise<CommitWithFiles[]> {
    await this.ensureValid();

    try {
      const logOptions: Record<string, unknown> = {
        format: {
          hash: '%H',
          author: '%an',
          email: '%ae',
          date: '%ai',
          message: '%s',
          refs: '%D',
          body: '%b',
        },
        '--stat': null, // Include file statistics
      };

      // Add filters based on options
      if (options.branch) {
        logOptions.from = options.branch;
      }

      if (options.since) {
        logOptions.after = options.since instanceof Date
          ? options.since.toISOString()
          : options.since;
      }

      if (options.until) {
        logOptions.before = options.until instanceof Date
          ? options.until.toISOString()
          : options.until;
      }

      if (options.author) {
        logOptions.author = options.author;
      }

      if (options.maxCount) {
        logOptions.maxCount = options.maxCount;
      }

      const log = await this.git.log(logOptions);

      // Transform to our CommitWithFiles type
      return log.all.map((commit) => {
        // Validate git response structure
        if (!isValidGitLogEntry(commit)) {
          throw new GitOperationError(
            'getCommitsWithFiles',
            `Invalid commit format from git: missing required fields`
          );
        }

        const files: FileChange[] = commit.diff?.files
          ? commit.diff.files.map((f) => {
              // Handle different file types (text vs binary)
              // Binary files don't have changes/insertions/deletions
              const hasStats = 'changes' in f && 'insertions' in f && 'deletions' in f;
              return {
                file: f.file,
                changes: hasStats ? (f as { changes: number }).changes : 0,
                insertions: hasStats ? (f as { insertions: number }).insertions : 0,
                deletions: hasStats ? (f as { deletions: number }).deletions : 0,
                binary: f.binary,
              };
            })
          : [];

        return {
          hash: commit.hash,
          author: commit.author || 'Unknown',
          email: commit.email || '',
          date: new Date(commit.date),
          message: commit.message,
          refs: commit.refs || '',
          body: commit.body || '',
          files,
          diffSummary: {
            changed: commit.diff?.changed || 0,
            insertions: commit.diff?.insertions || 0,
            deletions: commit.diff?.deletions || 0,
          },
        };
      });
    } catch (error) {
      throw new GitOperationError(
        'getCommitsWithFiles',
        'Failed to fetch commits with file information',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets the repository path
   */
  getPath(): string {
    return this.repoPath;
  }
}

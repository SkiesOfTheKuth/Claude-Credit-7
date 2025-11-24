import { simpleGit, SimpleGit, DefaultLogFields, LogResult } from 'simple-git';
import { resolve } from 'path';
import { InvalidRepositoryError, GitOperationError } from '../utils/errors.js';
import type { Commit, RepositoryInfo, AnalysisOptions, CommitWithFiles, FileChange } from '../types/index.js';

/**
 * Wrapper around simple-git for repository operations
 * Provides a clean interface and proper error handling
 */
export class Repository {
  private git?: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = resolve(repoPath);
  }

  private getGitInstance(): SimpleGit {
    if (!this.git) {
      this.git = simpleGit();
    }

    this.git.cwd?.(this.repoPath);

    return this.git;
  }

  /**
   * Validates that the path is a git repository
   */
  async isValid(): Promise<boolean> {
    try {
      const git = this.getGitInstance();
      await git.revparse(['--git-dir']);
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
      const status = await this.getGitInstance().status();
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
      const remotes = await this.getGitInstance().getRemotes();
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
      const result = await this.getGitInstance().raw(['rev-list', '--count', 'HEAD']);
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

      const log: LogResult<DefaultLogFields> = await this.getGitInstance().log(logOptions);

      // Transform to our Commit type
      return log.all.map((commit) => ({
        hash: commit.hash,
        author:
          (commit as { author?: string }).author ||
          (commit as { author_name?: string }).author_name ||
          'Unknown',
        email:
          (commit as { email?: string }).email ||
          (commit as { author_email?: string }).author_email ||
          '',
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

      const log = await this.getGitInstance().log(logOptions);

      // Transform to our CommitWithFiles type
      return log.all.map((commit) => {
        const rawCommit = commit as unknown as {
          hash: string;
          author?: string;
          email?: string;
          date: string;
          message: string;
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
        };

        const files: FileChange[] = rawCommit.diff?.files
          ? rawCommit.diff.files.map((f) => ({
              file: f.file,
              changes: f.changes,
              insertions: f.insertions,
              deletions: f.deletions,
              binary: f.binary,
            }))
          : [];

        return {
          hash: rawCommit.hash,
          author: rawCommit.author || 'Unknown',
          email: rawCommit.email || '',
          date: new Date(rawCommit.date),
          message: rawCommit.message,
          refs: rawCommit.refs || '',
          body: rawCommit.body || '',
          files,
          diffSummary: {
            changed: rawCommit.diff?.changed || 0,
            insertions: rawCommit.diff?.insertions || 0,
            deletions: rawCommit.diff?.deletions || 0,
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

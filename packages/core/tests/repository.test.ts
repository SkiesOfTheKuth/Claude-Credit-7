/**
 * Tests for Repository class
 * Covers git operations, error handling, and edge cases
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  mockValidStatus,
  mockDetachedStatus,
  mockRemotes,
  mockNoRemotes,
  mockLogResponse,
  mockLogWithFilesResponse,
  mockEmptyLog,
  mockCommitCount,
  mockLogWithMissingFields,
  mockLogFilteredByAuthor,
  mockLogFilteredByDate,
  mockInvalidRepoError,
  mockGitCommandError,
  mockPermissionError,
} from './fixtures/mockGitResponses.js';

// Mock simple-git module with inline mock implementation
const mockGitInstance = {
  revparse: jest.fn(),
  status: jest.fn(),
  getRemotes: jest.fn(),
  raw: jest.fn(),
  log: jest.fn(),
};

await jest.unstable_mockModule('simple-git', () => ({
  __esModule: true,
  simpleGit: () => mockGitInstance,
}));

// Import after mocking
const { Repository } = await import('../src/git/repository.js');
const { InvalidRepositoryError, GitOperationError } = await import('../src/utils/errors.js');

describe('Repository', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with resolved absolute path', () => {
      const repo = new Repository('/tmp/test-repo');
      expect(repo.getPath()).toMatch(/test-repo/);
    });

    it('should resolve relative paths to absolute', () => {
      const repo = new Repository('.');
      const path = repo.getPath();
      expect(path).toMatch(/Claude-Credit-7/);
    });
  });

  describe('isValid', () => {
    it('should return true for valid git repository', async () => {
      mockGitInstance.revparse = jest.fn().mockResolvedValue('.git');

      const repo = new Repository('/tmp/valid-repo');
      const result = await repo.isValid();

      expect(result).toBe(true);
      expect(mockGitInstance.revparse).toHaveBeenCalledWith(['--git-dir']);
    });

    it('should return false for non-git directory', async () => {
      mockGitInstance.revparse = jest.fn().mockRejectedValue(mockInvalidRepoError);

      const repo = new Repository('/tmp/not-a-repo');
      const result = await repo.isValid();

      expect(result).toBe(false);
    });

    it('should return false when git command fails', async () => {
      mockGitInstance.revparse = jest.fn().mockRejectedValue(new Error('git command not found'));

      const repo = new Repository('/tmp/test');
      const result = await repo.isValid();

      expect(result).toBe(false);
    });
  });

  describe('ensureValid', () => {
    it('should not throw for valid repository', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');

      const repo = new Repository('/tmp/valid-repo');

      await expect(repo.ensureValid()).resolves.not.toThrow();
    });

    it('should throw InvalidRepositoryError for invalid repository', async () => {
      (mockGitInstance.revparse as jest.Mock).mockRejectedValue(mockInvalidRepoError);

      const repo = new Repository('/tmp/invalid-repo');

      await expect(repo.ensureValid()).rejects.toThrow(InvalidRepositoryError);
      await expect(repo.ensureValid()).rejects.toThrow('Invalid git repository');
    });
  });

  describe('getInfo', () => {
    it('should return repository metadata for valid repo', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockResolvedValue(mockValidStatus);
      (mockGitInstance.getRemotes as jest.Mock).mockResolvedValue(mockRemotes);
      (mockGitInstance.raw as jest.Mock).mockResolvedValue(mockCommitCount);

      const repo = new Repository('/tmp/test-repo');
      const info = await repo.getInfo();

      expect(info).toEqual({
        path: expect.stringContaining('test-repo'),
        isValid: true,
        currentBranch: 'main',
        remotes: ['origin', 'upstream'],
        totalCommits: 42,
      });
    });

    it('should handle detached HEAD state', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockResolvedValue(mockDetachedStatus);
      (mockGitInstance.getRemotes as jest.Mock).mockResolvedValue([]);
      (mockGitInstance.raw as jest.Mock).mockResolvedValue('10');

      const repo = new Repository('/tmp/test-repo');
      const info = await repo.getInfo();

      expect(info.currentBranch).toBe('HEAD');
    });

    it('should handle repos with no remotes', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockResolvedValue(mockValidStatus);
      (mockGitInstance.getRemotes as jest.Mock).mockResolvedValue(mockNoRemotes);
      (mockGitInstance.raw as jest.Mock).mockResolvedValue('5');

      const repo = new Repository('/tmp/local-repo');
      const info = await repo.getInfo();

      expect(info.remotes).toEqual([]);
    });

    it('should handle empty repos (0 commits)', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockResolvedValue(mockValidStatus);
      (mockGitInstance.getRemotes as jest.Mock).mockResolvedValue([]);
      (mockGitInstance.raw as jest.Mock).mockRejectedValue(new Error('fatal: bad revision HEAD'));

      const repo = new Repository('/tmp/empty-repo');
      const info = await repo.getInfo();

      expect(info.totalCommits).toBe(0);
    });

    it('should throw InvalidRepositoryError for invalid repo', async () => {
      (mockGitInstance.revparse as jest.Mock).mockRejectedValue(mockInvalidRepoError);

      const repo = new Repository('/tmp/invalid');

      await expect(repo.getInfo()).rejects.toThrow(InvalidRepositoryError);
    });

    it('should wrap errors in GitOperationError', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockRejectedValue(mockPermissionError);

      const repo = new Repository('/tmp/test');

      await expect(repo.getInfo()).rejects.toThrow(GitOperationError);
      await expect(repo.getInfo()).rejects.toThrow('Failed to retrieve repository information');
    });
  });

  describe('getCommits', () => {
    beforeEach(() => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
    });

    it('should fetch commits with default options', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogResponse);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommits();

      expect(commits).toHaveLength(3);
      expect(commits[0]).toMatchObject({
        hash: 'abc123def456',
        author: 'John Doe',
        email: 'john@example.com',
        message: 'feat: add new feature',
      });
    });

    it('should filter by branch', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogResponse);

      const repo = new Repository('/tmp/test-repo');
      await repo.getCommits({ branch: 'develop' });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'develop',
        })
      );
    });

    it('should filter by date range', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogFilteredByDate);

      const repo = new Repository('/tmp/test-repo');
      const since = new Date('2024-01-01');
      const until = new Date('2024-01-31');

      await repo.getCommits({ since, until });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          after: since.toISOString(),
          before: until.toISOString(),
        })
      );
    });

    it('should accept date strings', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogFilteredByDate);

      const repo = new Repository('/tmp/test-repo');
      await repo.getCommits({ since: '2024-01-01', until: '2024-01-31' });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          after: '2024-01-01',
          before: '2024-01-31',
        })
      );
    });

    it('should filter by author', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogFilteredByAuthor);

      const repo = new Repository('/tmp/test-repo');
      await repo.getCommits({ author: 'john@example.com' });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          author: 'john@example.com',
        })
      );
    });

    it('should respect maxCount limit', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockEmptyLog);

      const repo = new Repository('/tmp/test-repo');
      await repo.getCommits({ maxCount: 10 });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          maxCount: 10,
        })
      );
    });

    it('should handle empty result set', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockEmptyLog);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommits();

      expect(commits).toEqual([]);
    });

    it('should default missing fields', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogWithMissingFields);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommits();

      expect(commits[0]).toMatchObject({
        hash: 'abc123',
        author: 'Unknown',
        email: '',
        message: 'commit with missing fields',
        refs: '',
        body: '',
      });
    });

    it('should throw GitOperationError when git fails', async () => {
      (mockGitInstance.log as jest.Mock).mockRejectedValue(mockGitCommandError);

      const repo = new Repository('/tmp/test-repo');

      await expect(repo.getCommits()).rejects.toThrow(GitOperationError);
      await expect(repo.getCommits()).rejects.toThrow('Failed to fetch commits');
    });
  });

  describe('getCommitsWithFiles', () => {
    beforeEach(() => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
    });

    it('should fetch commits with file statistics', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogWithFilesResponse);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommitsWithFiles();

      expect(commits).toHaveLength(2);
      expect(commits[0]).toHaveProperty('files');
      expect(commits[0]).toHaveProperty('diffSummary');
      expect(commits[0]?.files).toHaveLength(2);
    });

    it('should parse file changes correctly', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogWithFilesResponse);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommitsWithFiles();

      expect(commits[0]?.files[0]).toEqual({
        file: 'src/analyzer.ts',
        changes: 40,
        insertions: 35,
        deletions: 5,
        binary: false,
      });
    });

    it('should handle commits with no file changes', async () => {
      const mockLogNoFiles = {
        all: [{
          hash: 'abc123',
          date: '2024-01-15T10:30:00Z',
          message: 'empty commit',
          refs: '',
          body: '',
          author: 'John Doe',
          email: 'john@example.com',
        }],
        latest: null,
        total: 1,
      };

      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogNoFiles);

      const repo = new Repository('/tmp/test-repo');
      const commits = await repo.getCommitsWithFiles();

      expect(commits[0]?.files).toEqual([]);
      expect(commits[0]?.diffSummary).toEqual({
        changed: 0,
        insertions: 0,
        deletions: 0,
      });
    });

    it('should apply all filters', async () => {
      (mockGitInstance.log as jest.Mock).mockResolvedValue(mockLogWithFilesResponse);

      const repo = new Repository('/tmp/test-repo');
      await repo.getCommitsWithFiles({
        branch: 'main',
        since: '2024-01-01',
        author: 'john@example.com',
        maxCount: 100,
      });

      expect(mockGitInstance.log).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'main',
          after: '2024-01-01',
          author: 'john@example.com',
          maxCount: 100,
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle permission errors', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.status as jest.Mock).mockRejectedValue(mockPermissionError);

      const repo = new Repository('/tmp/protected-repo');

      await expect(repo.getInfo()).rejects.toThrow(GitOperationError);
    });

    it('should include error context', async () => {
      (mockGitInstance.revparse as jest.Mock).mockResolvedValue('.git');
      (mockGitInstance.log as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      const repo = new Repository('/tmp/test-repo');

      try {
        await repo.getCommits();
        throw new Error('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitOperationError);
        if (error instanceof GitOperationError) {
          expect(error.message).toContain('Failed to fetch commits');
          expect(error.cause).toBeInstanceOf(Error);
        }
      }
    });
  });

  describe('getPath', () => {
    it('should return the repository path', () => {
      const repo = new Repository('/tmp/test-repo');
      expect(repo.getPath()).toContain('test-repo');
    });
  });
});

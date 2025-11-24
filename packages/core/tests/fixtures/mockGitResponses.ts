/**
 * Mock responses from simple-git operations
 * These fixtures represent realistic git command outputs
 */

import type { LogResult, DefaultLogFields, StatusResult, RemoteWithRefs } from 'simple-git';

/**
 * Mock status response for a valid repository
 */
export const mockValidStatus: StatusResult = {
  not_added: [],
  conflicted: [],
  created: [],
  deleted: [],
  modified: [],
  renamed: [],
  files: [],
  staged: [],
  ahead: 0,
  behind: 0,
  current: 'main',
  tracking: 'origin/main',
  detached: false,
  isClean: () => true,
};

/**
 * Mock status response for a detached HEAD state
 */
export const mockDetachedStatus: StatusResult = {
  ...mockValidStatus,
  current: null,
  detached: true,
};

/**
 * Mock remotes response
 */
export const mockRemotes: RemoteWithRefs[] = [
  {
    name: 'origin',
    refs: {
      fetch: 'https://github.com/user/repo.git',
      push: 'https://github.com/user/repo.git',
    },
  },
  {
    name: 'upstream',
    refs: {
      fetch: 'https://github.com/upstream/repo.git',
      push: 'https://github.com/upstream/repo.git',
    },
  },
];

/**
 * Mock empty remotes (local-only repository)
 */
export const mockNoRemotes: RemoteWithRefs[] = [];

/**
 * Mock log response with basic commits
 */
export const mockLogResponse: LogResult<DefaultLogFields> = {
  all: [
    {
      hash: 'abc123def456',
      date: '2024-01-15T10:30:00-05:00',
      message: 'feat: add new feature',
      refs: 'HEAD -> main, origin/main',
      body: 'This is the commit body\n\nWith multiple lines',
      author: 'John Doe',
      email: 'john@example.com',
    },
    {
      hash: 'def456ghi789',
      date: '2024-01-14T09:15:00-05:00',
      message: 'fix: resolve bug',
      refs: '',
      body: '',
      author: 'Jane Smith',
      email: 'jane@example.com',
    },
    {
      hash: 'ghi789jkl012',
      date: '2024-01-13T14:20:00-05:00',
      message: 'Initial commit',
      refs: '',
      body: '',
      author: 'John Doe',
      email: 'john@example.com',
    },
  ],
  latest: {
    hash: 'abc123def456',
    date: '2024-01-15T10:30:00-05:00',
    message: 'feat: add new feature',
    refs: 'HEAD -> main, origin/main',
    body: 'This is the commit body\n\nWith multiple lines',
    author: 'John Doe',
    email: 'john@example.com',
  },
  total: 3,
};

/**
 * Mock log response with commits including file statistics
 */
export const mockLogWithFilesResponse = {
  all: [
    {
      hash: 'abc123def456',
      date: '2024-01-15T10:30:00-05:00',
      message: 'feat: add new feature',
      refs: 'HEAD -> main',
      body: 'Added new analyzer',
      author: 'John Doe',
      email: 'john@example.com',
      diff: {
        changed: 2,
        insertions: 50,
        deletions: 10,
        files: [
          {
            file: 'src/analyzer.ts',
            changes: 40,
            insertions: 35,
            deletions: 5,
            binary: false,
          },
          {
            file: 'src/index.ts',
            changes: 20,
            insertions: 15,
            deletions: 5,
            binary: false,
          },
        ],
      },
    },
    {
      hash: 'def456ghi789',
      date: '2024-01-14T09:15:00-05:00',
      message: 'fix: resolve bug',
      refs: '',
      body: '',
      author: 'Jane Smith',
      email: 'jane@example.com',
      diff: {
        changed: 1,
        insertions: 5,
        deletions: 3,
        files: [
          {
            file: 'src/utils.ts',
            changes: 8,
            insertions: 5,
            deletions: 3,
            binary: false,
          },
        ],
      },
    },
  ],
  latest: null,
  total: 2,
};

/**
 * Mock empty log response (empty repository)
 */
export const mockEmptyLog: LogResult<DefaultLogFields> = {
  all: [],
  latest: null,
  total: 0,
};

/**
 * Mock commit count response (valid repository)
 */
export const mockCommitCount = '42';

/**
 * Mock commit count for empty repository
 */
export const mockEmptyCommitCount = '0';

/**
 * Mock log response with commits missing optional fields
 */
export const mockLogWithMissingFields: LogResult = {
  all: [
    {
      hash: 'abc123',
      date: '2024-01-15T10:30:00Z',
      message: 'commit with missing fields',
      // Missing: refs, body, author, email
    } as DefaultLogFields,
  ],
  latest: null,
  total: 1,
};

/**
 * Mock log response filtered by author
 */
export const mockLogFilteredByAuthor: LogResult<DefaultLogFields> = {
  all: [
    {
      hash: 'abc123',
      date: '2024-01-15T10:30:00Z',
      message: 'Johns commit',
      refs: '',
      body: '',
      author_name: 'John Doe',
      author_email: 'john@example.com',
    } as DefaultLogFields & { author_name: string; author_email: string },
  ],
  latest: null,
  total: 1,
};

/**
 * Mock log response filtered by date range
 */
export const mockLogFilteredByDate: LogResult<DefaultLogFields> = {
  all: [
    {
      hash: 'def456',
      date: '2024-01-14T09:15:00Z',
      message: 'Recent commit',
      refs: '',
      body: '',
      author_name: 'Jane Smith',
      author_email: 'jane@example.com',
    } as DefaultLogFields & { author_name: string; author_email: string },
  ],
  latest: null,
  total: 1,
};

/**
 * Mock error for invalid repository
 */
export const mockInvalidRepoError = new Error(
  'fatal: not a git repository (or any of the parent directories): .git'
);

/**
 * Mock error for git command failure
 */
export const mockGitCommandError = new Error('fatal: bad object HEAD');

/**
 * Mock error for permission denied
 */
export const mockPermissionError = new Error('fatal: could not read from repository: Permission denied');

/**
 * Mock error for network timeout
 */
export const mockNetworkError = new Error('fatal: unable to access repository: Connection timed out');

import { describe, it, expect, beforeEach } from '@jest/globals';
import { FileAnalyzer } from '../src/analyzers/files.js';
import { AnalysisFailedError } from '../src/utils/errors.js';
import type { CommitWithFiles, FileChange } from '../src/types/index.js';

describe('FileAnalyzer', () => {
  let analyzer: FileAnalyzer;

  beforeEach(() => {
    analyzer = new FileAnalyzer();
  });

  const createMockFileChange = (
    file: string,
    changes: number,
    insertions: number,
    deletions: number
  ): FileChange => ({
    file,
    changes,
    insertions,
    deletions,
    binary: false,
  });

  const createMockCommit = (
    hash: string,
    author: string,
    email: string,
    date: Date,
    files: FileChange[]
  ): CommitWithFiles => ({
    hash,
    author,
    email,
    date,
    message: 'Test commit',
    refs: '',
    body: '',
    files,
    diffSummary: {
      changed: files.length,
      insertions: files.reduce((sum, f) => sum + f.insertions, 0),
      deletions: files.reduce((sum, f) => sum + f.deletions, 0),
    },
  });

  describe('analyze', () => {
    it('should throw error when given empty array', () => {
      expect(() => analyzer.analyze([])).toThrow(AnalysisFailedError);
      expect(() => analyzer.analyze([])).toThrow('No commits to analyze');
    });

    it('should analyze a single commit with one file correctly', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          [createMockFileChange('src/index.ts', 10, 8, 2)]
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalFiles).toBe(1);
      expect(result.totalChanges).toBe(10);
      expect(result.totalInsertions).toBe(8);
      expect(result.totalDeletions).toBe(2);
      expect(result.netChange).toBe(6);
      expect(result.files).toHaveLength(1);
      expect(result.files[0]?.path).toBe('src/index.ts');
      expect(result.files[0]?.changeCount).toBe(1);
    });

    it('should track file changes across multiple commits', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          [createMockFileChange('src/app.ts', 10, 10, 0)]
        ),
        createMockCommit(
          'def456',
          'Jane',
          'jane@example.com',
          new Date('2024-01-16T11:00:00Z'),
          [createMockFileChange('src/app.ts', 5, 3, 2)]
        ),
        createMockCommit(
          'ghi789',
          'John',
          'john@example.com',
          new Date('2024-01-17T12:00:00Z'),
          [createMockFileChange('src/app.ts', 8, 5, 3)]
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalFiles).toBe(1);
      expect(result.totalChanges).toBe(23); // 10 + 5 + 8 line changes
      expect(result.files[0]?.changeCount).toBe(3);
      expect(result.files[0]?.totalInsertions).toBe(18);
      expect(result.files[0]?.totalDeletions).toBe(5);
      expect(result.files[0]?.authors.size).toBe(2); // John and Jane
    });

    it('should track multiple files separately', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          [
            createMockFileChange('src/app.ts', 10, 10, 0),
            createMockFileChange('src/utils.ts', 5, 5, 0),
          ]
        ),
        createMockCommit(
          'def456',
          'Jane',
          'jane@example.com',
          new Date('2024-01-16T11:00:00Z'),
          [createMockFileChange('src/app.ts', 3, 2, 1)]
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalFiles).toBe(2);
      const appFile = result.files.find((f) => f.path === 'src/app.ts');
      const utilsFile = result.files.find((f) => f.path === 'src/utils.ts');

      expect(appFile?.changeCount).toBe(2); // Changed in 2 commits
      expect(utilsFile?.changeCount).toBe(1); // Changed in 1 commit
      expect(appFile?.authors.size).toBe(2); // John and Jane
      expect(utilsFile?.authors.size).toBe(1); // Only John
    });

    it('should identify hotspots correctly', () => {
      const commits = [
        createMockCommit('c1', 'John', 'john@example.com', new Date(), [
          createMockFileChange('frequently-changed.ts', 5, 5, 0),
        ]),
        createMockCommit('c2', 'John', 'john@example.com', new Date(), [
          createMockFileChange('frequently-changed.ts', 3, 3, 0),
        ]),
        createMockCommit('c3', 'John', 'john@example.com', new Date(), [
          createMockFileChange('frequently-changed.ts', 2, 2, 0),
        ]),
        createMockCommit('c4', 'John', 'john@example.com', new Date(), [
          createMockFileChange('rarely-changed.ts', 100, 100, 0),
        ]),
      ];

      const result = analyzer.analyze(commits);

      expect(result.hotspots).toHaveLength(2);
      expect(result.hotspots[0]?.path).toBe('frequently-changed.ts');
      expect(result.hotspots[0]?.changeCount).toBe(3);
      expect(result.hotspots[1]?.path).toBe('rarely-changed.ts');
      expect(result.hotspots[1]?.changeCount).toBe(1);
    });

    it('should identify largest changes correctly', () => {
      const commits = [
        createMockCommit('c1', 'John', 'john@example.com', new Date(), [
          createMockFileChange('small-changes.ts', 5, 3, 2),
        ]),
        createMockCommit('c2', 'John', 'john@example.com', new Date(), [
          createMockFileChange('large-changes.ts', 1000, 800, 200),
        ]),
      ];

      const result = analyzer.analyze(commits);

      expect(result.largestChanges).toHaveLength(2);
      expect(result.largestChanges[0]?.path).toBe('large-changes.ts');
      expect(result.largestChanges[0]?.totalChanges).toBe(1000);
    });

    it('should calculate correct date ranges for files', () => {
      const commits = [
        createMockCommit(
          'c1',
          'John',
          'john@example.com',
          new Date('2024-01-01T10:00:00Z'),
          [createMockFileChange('src/app.ts', 10, 10, 0)]
        ),
        createMockCommit(
          'c2',
          'John',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          [createMockFileChange('src/app.ts', 5, 5, 0)]
        ),
      ];

      const result = analyzer.analyze(commits);

      const file = result.files[0];
      expect(file?.firstSeen).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(file?.lastModified).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should calculate net change correctly', () => {
      const commits = [
        createMockCommit('c1', 'John', 'john@example.com', new Date(), [
          createMockFileChange('file1.ts', 100, 80, 20), // +60 net
          createMockFileChange('file2.ts', 50, 10, 40), // -30 net
        ]),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalInsertions).toBe(90);
      expect(result.totalDeletions).toBe(60);
      expect(result.netChange).toBe(30); // 90 - 60
    });
  });

  describe('getFilesByAuthor', () => {
    it('should filter files by author email', () => {
      const commits = [
        createMockCommit('c1', 'Alice', 'alice@example.com', new Date(), [
          createMockFileChange('alice-file.ts', 10, 10, 0),
        ]),
        createMockCommit('c2', 'Bob', 'bob@example.com', new Date(), [
          createMockFileChange('bob-file.ts', 10, 10, 0),
        ]),
        createMockCommit('c3', 'Alice', 'alice@example.com', new Date(), [
          createMockFileChange('shared-file.ts', 10, 10, 0),
        ]),
        createMockCommit('c4', 'Bob', 'bob@example.com', new Date(), [
          createMockFileChange('shared-file.ts', 10, 10, 0),
        ]),
      ];

      const result = analyzer.analyze(commits);
      const aliceFiles = analyzer.getFilesByAuthor(result.files, 'alice@example.com');

      expect(aliceFiles).toHaveLength(2);
      expect(aliceFiles.some((f) => f.path === 'alice-file.ts')).toBe(true);
      expect(aliceFiles.some((f) => f.path === 'shared-file.ts')).toBe(true);
      expect(aliceFiles.some((f) => f.path === 'bob-file.ts')).toBe(false);
    });
  });

  describe('getCollaborationHotspots', () => {
    it('should identify files touched by multiple authors', () => {
      const commits = [
        createMockCommit('c1', 'Alice', 'alice@example.com', new Date(), [
          createMockFileChange('shared.ts', 10, 10, 0),
        ]),
        createMockCommit('c2', 'Bob', 'bob@example.com', new Date(), [
          createMockFileChange('shared.ts', 10, 10, 0),
        ]),
        createMockCommit('c3', 'Charlie', 'charlie@example.com', new Date(), [
          createMockFileChange('shared.ts', 10, 10, 0),
        ]),
        createMockCommit('c4', 'Alice', 'alice@example.com', new Date(), [
          createMockFileChange('solo.ts', 10, 10, 0),
        ]),
      ];

      const result = analyzer.analyze(commits);
      const collaboration = analyzer.getCollaborationHotspots(result.files, 2);

      expect(collaboration).toHaveLength(1);
      expect(collaboration[0]?.path).toBe('shared.ts');
      expect(collaboration[0]?.authors.size).toBe(3);
    });
  });

  describe('getChurnMetrics', () => {
    it('should calculate churn as insertions + deletions', () => {
      const commits = [
        createMockCommit('c1', 'John', 'john@example.com', new Date(), [
          createMockFileChange('high-churn.ts', 100, 60, 40), // 100 churn
          createMockFileChange('low-churn.ts', 10, 8, 2), // 10 churn
        ]),
      ];

      const result = analyzer.analyze(commits);
      const churn = analyzer.getChurnMetrics(result.files);

      expect(churn.get('high-churn.ts')).toBe(100);
      expect(churn.get('low-churn.ts')).toBe(10);
    });
  });
});

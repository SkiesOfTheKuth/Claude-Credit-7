import { describe, it, expect, beforeEach } from '@jest/globals';
import { CommitAnalyzer } from '../src/analyzers/commits.js';
import { AnalysisFailedError } from '../src/utils/errors.js';
import type { Commit } from '../src/types/index.js';

describe('CommitAnalyzer', () => {
  let analyzer: CommitAnalyzer;

  beforeEach(() => {
    analyzer = new CommitAnalyzer();
  });

  const createMockCommit = (
    hash: string,
    author: string,
    email: string,
    date: Date,
    message: string
  ): Commit => ({
    hash,
    author,
    email,
    date,
    message,
    refs: '',
    body: '',
  });

  describe('analyze', () => {
    it('should throw error when given empty array', () => {
      expect(() => analyzer.analyze([])).toThrow(AnalysisFailedError);
      expect(() => analyzer.analyze([])).toThrow('No commits to analyze');
    });

    it('should analyze a single commit correctly', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          'Initial commit'
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalCommits).toBe(1);
      expect(result.authors).toHaveLength(1);
      expect(result.authors[0]?.name).toBe('John Doe');
      expect(result.authors[0]?.commitCount).toBe(1);
    });

    it('should correctly count multiple commits from same author', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          'First commit'
        ),
        createMockCommit(
          'def456',
          'John Doe',
          'john@example.com',
          new Date('2024-01-16T11:00:00Z'),
          'Second commit'
        ),
        createMockCommit(
          'ghi789',
          'John Doe',
          'john@example.com',
          new Date('2024-01-17T12:00:00Z'),
          'Third commit'
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalCommits).toBe(3);
      expect(result.authors).toHaveLength(1);
      expect(result.authors[0]?.commitCount).toBe(3);
    });

    it('should distinguish between different authors', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-15T10:00:00Z'),
          'Commit 1'
        ),
        createMockCommit(
          'def456',
          'Jane Smith',
          'jane@example.com',
          new Date('2024-01-16T11:00:00Z'),
          'Commit 2'
        ),
        createMockCommit(
          'ghi789',
          'John Doe',
          'john@example.com',
          new Date('2024-01-17T12:00:00Z'),
          'Commit 3'
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.totalCommits).toBe(3);
      expect(result.authors).toHaveLength(2);

      const john = result.authors.find((a) => a.email === 'john@example.com');
      const jane = result.authors.find((a) => a.email === 'jane@example.com');

      expect(john?.commitCount).toBe(2);
      expect(jane?.commitCount).toBe(1);
    });

    it('should calculate correct date range', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-01T10:00:00Z'),
          'First'
        ),
        createMockCommit(
          'def456',
          'John Doe',
          'john@example.com',
          new Date('2024-01-15T11:00:00Z'),
          'Middle'
        ),
        createMockCommit(
          'ghi789',
          'John Doe',
          'john@example.com',
          new Date('2024-01-31T12:00:00Z'),
          'Last'
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.dateRange.earliest).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.dateRange.latest).toEqual(new Date('2024-01-31T12:00:00Z'));
      expect(result.dateRange.spanDays).toBe(31); // Jan 1 to Jan 31 is 31 days
    });

    it('should calculate correct date range across day boundary', () => {
      const commits = [
        createMockCommit(
          'abc123',
          'John Doe',
          'john@example.com',
          new Date('2024-01-01T23:00:00Z'),
          'First'
        ),
        createMockCommit(
          'def456',
          'John Doe',
          'john@example.com',
          new Date('2024-01-02T01:00:00Z'),
          'Last'
        ),
      ];

      const result = analyzer.analyze(commits);

      expect(result.dateRange.earliest).toEqual(
        new Date('2024-01-01T23:00:00Z')
      );
      expect(result.dateRange.latest).toEqual(
        new Date('2024-01-02T01:00:00Z')
      );
      expect(result.dateRange.spanDays).toBe(2);
    });

    it('should rank top authors correctly', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date(), 'c1'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date(), 'c2'),
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date(), 'c3'),
        createMockCommit('b1', 'Bob', 'bob@example.com', new Date(), 'c4'),
        createMockCommit('b2', 'Bob', 'bob@example.com', new Date(), 'c5'),
        createMockCommit('c1', 'Charlie', 'charlie@example.com', new Date(), 'c6'),
      ];

      const result = analyzer.analyze(commits);

      expect(result.topAuthors).toHaveLength(3);
      expect(result.topAuthors[0]?.name).toBe('Alice');
      expect(result.topAuthors[0]?.commitCount).toBe(3);
      expect(result.topAuthors[1]?.name).toBe('Bob');
      expect(result.topAuthors[1]?.commitCount).toBe(2);
      expect(result.topAuthors[2]?.name).toBe('Charlie');
      expect(result.topAuthors[2]?.commitCount).toBe(1);
    });

    it('should group commits by day correctly', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date('2024-01-15T10:00:00Z'), 'c1'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date('2024-01-15T14:00:00Z'), 'c2'),
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date('2024-01-16T10:00:00Z'), 'c3'),
      ];

      const result = analyzer.analyze(commits);

      expect(result.commitsByDay.get('2024-01-15')).toBe(2);
      expect(result.commitsByDay.get('2024-01-16')).toBe(1);
    });

    it('should group commits by hour correctly', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date('2024-01-15T09:30:00Z'), 'c1'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date('2024-01-15T09:45:00Z'), 'c2'),
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date('2024-01-15T14:00:00Z'), 'c3'),
      ];

      const result = analyzer.analyze(commits);

      expect(result.commitsByHour.get(9)).toBe(2);
      expect(result.commitsByHour.get(14)).toBe(1);
      expect(result.commitsByHour.get(0)).toBe(0); // Hours with no commits should be 0
    });

    it('should group commits by UTC hour, not local hour', () => {
      class FixedOffsetDate extends Date {
        constructor(...args: ConstructorParameters<typeof Date>) {
          super(...args);
        }

        override getHours(): number {
          const forcedOffsetHours = 5; // Pretend local time is UTC-5
          return (super.getUTCHours() + 24 - forcedOffsetHours) % 24;
        }
      }

      const commitDate = new FixedOffsetDate('2024-01-15T23:30:00Z');
      const commits = [
        createMockCommit(
          'a1',
          'Alice',
          'alice@example.com',
          commitDate,
          'Late night UTC commit'
        ),
      ];

      const result = analyzer.analyze(commits);
      const localHour = commitDate.getHours();
      const utcHour = commitDate.getUTCHours();

      expect(localHour).not.toBe(utcHour);
      expect(result.commitsByHour.get(utcHour)).toBe(1);
      expect(result.commitsByHour.get(localHour)).toBe(0);
    });

    it('should calculate average commits per day', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date('2024-01-01T10:00:00Z'), 'c1'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date('2024-01-05T10:00:00Z'), 'c2'),
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date('2024-01-11T10:00:00Z'), 'c3'),
      ];

      const result = analyzer.analyze(commits);

      // 3 commits over 11 days (Jan 1 to Jan 11 inclusive)
      expect(result.averageCommitsPerDay).toBeCloseTo(0.27);
    });
  });

  describe('getCommitsByDayOfWeek', () => {
    it('should group commits by day of week', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date('2024-01-15T10:00:00Z'), 'c1'), // Monday
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date('2024-01-16T10:00:00Z'), 'c2'), // Tuesday
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date('2024-01-22T10:00:00Z'), 'c3'), // Monday
      ];

      const result = analyzer.getCommitsByDayOfWeek(commits);

      expect(result.get(1)).toBe(2); // Monday
      expect(result.get(2)).toBe(1); // Tuesday
      expect(result.get(0)).toBe(0); // Sunday (no commits)
    });
  });

  describe('getCommitsByAuthor', () => {
    it('should filter commits by author email', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date(), 'c1'),
        createMockCommit('b1', 'Bob', 'bob@example.com', new Date(), 'c2'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date(), 'c3'),
      ];

      const aliceCommits = analyzer.getCommitsByAuthor(commits, 'alice@example.com');

      expect(aliceCommits).toHaveLength(2);
      expect(aliceCommits.every((c) => c.email === 'alice@example.com')).toBe(true);
    });
  });

  describe('getCommitsInRange', () => {
    it('should filter commits within date range', () => {
      const commits = [
        createMockCommit('a1', 'Alice', 'alice@example.com', new Date('2024-01-01T10:00:00Z'), 'c1'),
        createMockCommit('a2', 'Alice', 'alice@example.com', new Date('2024-01-15T10:00:00Z'), 'c2'),
        createMockCommit('a3', 'Alice', 'alice@example.com', new Date('2024-01-31T10:00:00Z'), 'c3'),
      ];

      const filtered = analyzer.getCommitsInRange(
        commits,
        new Date('2024-01-10T00:00:00Z'),
        new Date('2024-01-20T00:00:00Z')
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.hash).toBe('a2');
    });
  });
});

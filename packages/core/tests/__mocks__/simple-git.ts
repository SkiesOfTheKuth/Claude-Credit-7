/**
 * Mock implementation of simple-git for testing
 */

import { jest } from '@jest/globals';
import type { SimpleGit } from 'simple-git';

export const mockGitInstance = {
  revparse: jest.fn(),
  status: jest.fn(),
  getRemotes: jest.fn(),
  raw: jest.fn(),
  log: jest.fn(),
} as unknown as SimpleGit;

export const simpleGit = jest.fn(() => mockGitInstance);

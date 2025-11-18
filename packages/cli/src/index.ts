#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createAnalyzeCommand } from './commands/analyze.js';

const program = new Command();

program
  .name('git-analyzer')
  .description('A powerful git repository analyzer')
  .version('0.1.0');

// Add commands
program.addCommand(createAnalyzeCommand());

// Show help if no command provided
if (process.argv.length === 2) {
  console.log(chalk.bold.cyan('🔍 Git Repository Analyzer'));
  console.log('');
  program.help();
}

// Parse arguments
program.parse();

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { Repository, CommitAnalyzer, FileAnalyzer, type Author, type FileStats } from '@git-analyzer/core';
import type { AnalysisOptions } from '@git-analyzer/core';

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? 'unknown';
}

/**
 * Formats a number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Analyze command implementation
 */
export function createAnalyzeCommand(): Command {
  return new Command('analyze')
    .description('Analyze a git repository')
    .argument('[path]', 'Path to git repository', '.')
    .option('-b, --branch <branch>', 'Branch to analyze')
    .option('-s, --since <date>', 'Analyze commits since date')
    .option('-u, --until <date>', 'Analyze commits until date')
    .option('-a, --author <author>', 'Filter by author')
    .option('-m, --max-count <number>', 'Maximum number of commits to analyze', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (repoPath: string, options: Record<string, unknown>) => {
      const spinner = ora('Initializing repository...').start();

      try {
        // Create repository instance
        const repo = new Repository(repoPath);

        // Validate repository
        spinner.text = 'Validating repository...';
        const isValid = await repo.isValid();
        if (!isValid) {
          spinner.fail(chalk.red(`Not a valid git repository: ${repoPath}`));
          process.exit(1);
        }

        // Get repository info
        spinner.text = 'Fetching repository information...';
        const repoInfo = await repo.getInfo();

        // Fetch commits with file information
        spinner.text = 'Fetching commits and file changes...';
        const analysisOptions: Partial<AnalysisOptions> = {
          repoPath,
          branch: options.branch as string | undefined,
          since: options.since as string | undefined,
          until: options.until as string | undefined,
          author: options.author as string | undefined,
          maxCount: options.maxCount as number | undefined,
        };

        const commitsWithFiles = await repo.getCommitsWithFiles(analysisOptions);

        if (commitsWithFiles.length === 0) {
          spinner.warn(chalk.yellow('No commits found matching the criteria'));
          process.exit(0);
        }

        // Analyze commits
        spinner.text = 'Analyzing commits...';
        const commitAnalyzer = new CommitAnalyzer();
        // Convert CommitWithFiles to Commit for backward compatibility
        const commits = commitsWithFiles.map(c => ({
          hash: c.hash,
          author: c.author,
          email: c.email,
          date: c.date,
          message: c.message,
          refs: c.refs,
          body: c.body,
        }));
        const analysis = commitAnalyzer.analyze(commits);

        // Analyze file changes
        spinner.text = 'Analyzing file changes...';
        const fileAnalyzer = new FileAnalyzer();
        const fileAnalysis = fileAnalyzer.analyze(commitsWithFiles);

        spinner.succeed(chalk.green('Analysis complete!'));

        // Output results
        if (options.json) {
          // JSON output
          console.log(
            JSON.stringify(
              {
                repository: {
                  path: repoInfo.path,
                  branch: repoInfo.currentBranch,
                  totalCommits: repoInfo.totalCommits,
                },
                analysis: {
                  totalCommits: analysis.totalCommits,
                  dateRange: {
                    earliest: analysis.dateRange.earliest.toISOString(),
                    latest: analysis.dateRange.latest.toISOString(),
                    spanDays: analysis.dateRange.spanDays,
                  },
                  averageCommitsPerDay: analysis.averageCommitsPerDay,
                  authors: analysis.authors.map((a: Author) => ({
                    name: a.name,
                    email: a.email,
                    commitCount: a.commitCount,
                    firstCommit: a.firstCommit.toISOString(),
                    lastCommit: a.lastCommit.toISOString(),
                  })),
                  topAuthors: analysis.topAuthors.slice(0, 10).map((a: Author) => ({
                    name: a.name,
                    email: a.email,
                    commitCount: a.commitCount,
                  })),
                },
                fileAnalysis: {
                  totalFiles: fileAnalysis.totalFiles,
                  totalChanges: fileAnalysis.totalChanges,
                  totalInsertions: fileAnalysis.totalInsertions,
                  totalDeletions: fileAnalysis.totalDeletions,
                  netChange: fileAnalysis.netChange,
                  hotspots: fileAnalysis.hotspots.map((f: FileStats) => ({
                    path: f.path,
                    changeCount: f.changeCount,
                    totalChanges: f.totalChanges,
                    totalInsertions: f.totalInsertions,
                    totalDeletions: f.totalDeletions,
                    authorCount: f.authors.size,
                    firstSeen: f.firstSeen.toISOString(),
                    lastModified: f.lastModified.toISOString(),
                  })),
                  largestChanges: fileAnalysis.largestChanges.slice(0, 10).map((f: FileStats) => ({
                    path: f.path,
                    totalChanges: f.totalChanges,
                    changeCount: f.changeCount,
                  })),
                },
              },
              null,
              2
            )
          );
        } else {
          // Pretty output
          console.log('');
          console.log(chalk.bold.cyan('═══════════════════════════════════════════════'));
          console.log(chalk.bold.cyan('           GIT REPOSITORY ANALYSIS             '));
          console.log(chalk.bold.cyan('═══════════════════════════════════════════════'));
          console.log('');

          // Repository Info
          console.log(chalk.bold.white('📁 Repository Information'));
          console.log(chalk.gray('  Path:'), chalk.white(repoInfo.path));
          console.log(chalk.gray('  Branch:'), chalk.white(repoInfo.currentBranch));
          console.log(chalk.gray('  Total Commits:'), chalk.white(formatNumber(repoInfo.totalCommits)));
          console.log('');

          // Analysis Summary
          console.log(chalk.bold.white('📊 Analysis Summary'));
          console.log(
            chalk.gray('  Commits Analyzed:'),
            chalk.white(formatNumber(analysis.totalCommits))
          );
          console.log(
            chalk.gray('  Date Range:'),
            chalk.white(
              `${formatDate(analysis.dateRange.earliest)} to ${formatDate(analysis.dateRange.latest)}`
            )
          );
          console.log(
            chalk.gray('  Span:'),
            chalk.white(`${formatNumber(analysis.dateRange.spanDays)} days`)
          );
          console.log(
            chalk.gray('  Avg Commits/Day:'),
            chalk.white(analysis.averageCommitsPerDay.toFixed(2))
          );
          console.log(
            chalk.gray('  Total Authors:'),
            chalk.white(formatNumber(analysis.authors.length))
          );
          console.log('');

          // Top Contributors
          console.log(chalk.bold.white('🏆 Top Contributors'));
          analysis.topAuthors.slice(0, 10).forEach((author: Author, index: number) => {
            const percentage = ((author.commitCount / analysis.totalCommits) * 100).toFixed(1);
            const bar = '█'.repeat(Math.ceil(Number(percentage) / 2));

            console.log(
              chalk.gray(`  ${index + 1}.`),
              chalk.white(author.name.padEnd(25)),
              chalk.cyan(formatNumber(author.commitCount).padStart(6)),
              chalk.gray('commits'),
              chalk.yellow(`(${percentage}%)`),
              chalk.blue(bar)
            );
          });
          console.log('');

          // Activity Patterns
          console.log(chalk.bold.white('⏰ Activity Patterns'));

          // Find peak hour
          let peakHour = 0;
          let peakHourCommits = 0;
          analysis.commitsByHour.forEach((count: number, hour: number) => {
            if (count > peakHourCommits) {
              peakHour = hour;
              peakHourCommits = count;
            }
          });

          console.log(
            chalk.gray('  Most Active Hour:'),
            chalk.white(`${peakHour}:00 (${formatNumber(peakHourCommits)} commits)`)
          );

          // Find most active day
          let mostActiveDay = '';
          let mostActiveDayCommits = 0;
          analysis.commitsByDay.forEach((count: number, day: string) => {
            if (count > mostActiveDayCommits) {
              mostActiveDay = day;
              mostActiveDayCommits = count;
            }
          });

          console.log(
            chalk.gray('  Most Active Day:'),
            chalk.white(`${mostActiveDay} (${formatNumber(mostActiveDayCommits)} commits)`)
          );
          console.log('');

          // File Analysis
          console.log(chalk.bold.white('🔥 Code Hotspots & Metrics'));
          console.log(
            chalk.gray('  Total Files Changed:'),
            chalk.white(formatNumber(fileAnalysis.totalFiles))
          );
          console.log(
            chalk.gray('  Total Line Changes:'),
            chalk.white(formatNumber(fileAnalysis.totalChanges))
          );
          console.log(
            chalk.gray('  Lines Added:'),
            chalk.green(`+${formatNumber(fileAnalysis.totalInsertions)}`)
          );
          console.log(
            chalk.gray('  Lines Deleted:'),
            chalk.red(`-${formatNumber(fileAnalysis.totalDeletions)}`)
          );
          console.log(
            chalk.gray('  Net Change:'),
            fileAnalysis.netChange >= 0
              ? chalk.green(`+${formatNumber(fileAnalysis.netChange)}`)
              : chalk.red(formatNumber(fileAnalysis.netChange))
          );
          console.log('');

          // Top Hotspot Files
          if (fileAnalysis.hotspots.length > 0) {
            console.log(chalk.bold.white('🔥 Most Frequently Changed Files'));
            fileAnalysis.hotspots.slice(0, 10).forEach((file: FileStats, index: number) => {
              const percentage = fileAnalysis.totalChanges > 0
                ? ((file.changeCount / fileAnalysis.totalChanges) * 100).toFixed(1)
                : '0.0';
              const authors = file.authors.size;
              const authorLabel = authors === 1 ? 'author' : 'authors';

              console.log(
                chalk.gray(`  ${index + 1}.`),
                chalk.white(file.path.padEnd(45)),
                chalk.cyan(formatNumber(file.changeCount).padStart(4)),
                chalk.gray('changes'),
                chalk.yellow(`(${percentage}%)`),
                chalk.gray(`• ${authors} ${authorLabel}`)
              );
            });
            console.log('');
          }

          console.log(chalk.bold.cyan('═══════════════════════════════════════════════'));
          console.log('');
        }
      } catch (error) {
        spinner.fail(chalk.red('Analysis failed'));
        if (error instanceof Error) {
          console.error(chalk.red('Error:'), error.message);
          if (error.stack && process.env.DEBUG) {
            console.error(chalk.gray(error.stack));
          }
        }
        process.exit(1);
      }
    });
}

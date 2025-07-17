#!/usr/bin/env node

// Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from project root (go up one level from cli directory)
const projectRoot = path.resolve(__dirname, '..');
config({ path: path.join(projectRoot, '.env.local') });
config({ path: path.join(projectRoot, '.env') });

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { DatabaseAgent } from './agents/database-agent';
import { Logger } from './utils/logger';
import { ProjectAnalyzer } from './agents/project-analyzer';

const program = new Command();
const logger = new Logger();

program
  .name('db-agent')
  .description('Database Agent CLI for Spotify Clone - Automatically implements database features')
  .version('1.0.0');

// Interactive mode command
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode for database queries')
  .action(async () => {
    console.log(chalk.blue.bold('🎵 Spotify Clone Database Agent'));
    console.log(chalk.gray('Ready to help you implement database features!\n'));

    const agent = new DatabaseAgent();
    const analyzer = new ProjectAnalyzer();

    try {
      // Analyze current project
      logger.info('Analyzing current project structure...');
      const projectContext = await analyzer.analyzeProject();
      logger.success('Project analysis complete!');

      // Start interactive loop
      while (true) {
        const { query } = await inquirer.prompt([
          {
            type: 'input',
            name: 'query',
            message: chalk.cyan('What database feature would you like to implement?'),
            validate: (input) => {
              if (!input.trim()) {
                return 'Please enter a valid query';
              }
              return true;
            }
          }
        ]);

        if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
          console.log(chalk.yellow('Goodbye! 👋'));
          break;
        }

        try {
          logger.info(`Processing query: "${query}"`);
          await agent.executeQuery(query, projectContext);
          logger.success('Query executed successfully!');
        } catch (error) {
          logger.error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
        }

        const { continueAsking } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAsking',
            message: 'Would you like to make another query?',
            default: true
          }
        ]);

        if (!continueAsking) {
          console.log(chalk.yellow('Goodbye! 👋'));
          break;
        }
      }
    } catch (error) {
      logger.error(`Error in interactive mode: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Direct query command
program
  .command('query <query>')
  .alias('q')
  .description('Execute a database query directly')
  .action(async (query: string) => {
    console.log(chalk.blue.bold('🎵 Spotify Clone Database Agent'));
    
    const agent = new DatabaseAgent();
    const analyzer = new ProjectAnalyzer();

    try {
      logger.info('Analyzing current project structure...');
      const projectContext = await analyzer.analyzeProject();
      logger.success('Project analysis complete!');

      logger.info(`Processing query: "${query}"`);
      await agent.executeQuery(query, projectContext);
      logger.success('Query executed successfully!');
    } catch (error) {
      logger.error(`Failed to execute query: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .alias('s')
  .description('Show current project status and database configuration')
  .action(async () => {
    console.log(chalk.blue.bold('🎵 Spotify Clone Database Agent - Status'));
    
    const analyzer = new ProjectAnalyzer();
    
    try {
      const projectContext = await analyzer.analyzeProject();
      console.log(chalk.green('\n✅ Project Status:'));
      console.log(`- Components found: ${projectContext.components.length}`);
      console.log(`- Current data structures: ${projectContext.currentDataStructures.length}`);
      console.log(`- Existing APIs: ${projectContext.existingAPIs.length}`);
      console.log(`- Database tables: ${projectContext.databaseSchema.length}`);
      
      if (projectContext.supabaseConfigured) {
        console.log(chalk.green('- Supabase: Configured ✅'));
      } else {
        console.log(chalk.yellow('- Supabase: Not configured ⚠️'));
      }
    } catch (error) {
      logger.error(`Error checking status: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Help command with examples
program
  .command('examples')
  .description('Show example queries you can use')
  .action(() => {
    console.log(chalk.blue.bold('🎵 Example Database Queries:'));
    console.log(chalk.gray('Here are some example queries you can try:\n'));
    
    const examples = [
      'Can you store the recently played songs in a table',
      'Can you store the "Made for you" and "Popular albums" in a table',
      'Add a favorites system for users',
      'Create a search functionality with database backing',
      'Add user authentication and personalized playlists',
      'Create a rating system for songs',
      'Add play history tracking with timestamps'
    ];

    examples.forEach((example, index) => {
      console.log(chalk.cyan(`${index + 1}. "${example}"`));
    });

    console.log(chalk.gray('\nUsage examples:'));
    console.log(chalk.white('  db-agent interactive'));
    console.log(chalk.white('  db-agent query "Can you store the recently played songs in a table"'));
    console.log(chalk.white('  db-agent status'));
  });

// Default action when no command is provided
program.action(() => {
  console.log(chalk.blue.bold('🎵 Spotify Clone Database Agent'));
  console.log(chalk.gray('Use --help to see available commands or run in interactive mode:\n'));
  console.log(chalk.cyan('  db-agent interactive'));
  console.log(chalk.cyan('  db-agent examples'));
});

// Error handling
program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s\nSee --help for a list of available commands.'), program.args.join(' '));
  process.exit(1);
});

// Parse arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 
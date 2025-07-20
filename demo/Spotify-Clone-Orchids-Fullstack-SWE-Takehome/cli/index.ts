#!/usr/bin/env node

// Load environment variables FIRST, before any other imports
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs/promises';

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
import { MigrationExecutor } from './utils/migration-executor';

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
    console.log(chalk.blue.bold(' Spotify Clone Database Agent'));
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
    console.log(chalk.blue.bold(' Spotify Clone Database Agent'));
    
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
    console.log(chalk.blue.bold(' Spotify Clone Database Agent - Status'));
    
    const analyzer = new ProjectAnalyzer();
    const migrationExecutor = new MigrationExecutor();
    
    try {
      const projectContext = await analyzer.analyzeProject();
      console.log(chalk.green('\n Project Status:'));
      console.log(`- Components found: ${projectContext.components.length}`);
      console.log(`- Current data structures: ${projectContext.currentDataStructures.length}`);
      console.log(`- Existing APIs: ${projectContext.existingAPIs.length}`);
      console.log(`- Database tables: ${projectContext.databaseSchema.length}`);
      
      if (projectContext.supabaseConfigured) {
        console.log(chalk.green('- Supabase: Configured '));
        
        // Try to get migration status
        try {
          await migrationExecutor.initialize();
          const migrationStatus = await migrationExecutor.getMigrationStatus();
          console.log(`- Executed migrations: ${migrationStatus.executed.length}`);
          console.log(`- Pending migrations: ${migrationStatus.pending.length}`);
          
          if (migrationStatus.pending.length > 0) {
            console.log(chalk.yellow(`- Run 'db-agent migrations run' to execute pending migrations`));
          }
        } catch (error) {
        }
      } else {
        console.log(chalk.yellow('- Supabase: Not configured '));
      }
    } catch (error) {
      logger.error(`Error checking status: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Migration management commands
program
  .command('migrations')
  .alias('m')
  .description('Manage database migrations')
  .addCommand(
    new Command('status')
      .description('Show migration status')
      .action(async () => {
        console.log(chalk.blue.bold('🗄️  Migration Status'));
        
        const migrationExecutor = new MigrationExecutor();
        
        try {
          await migrationExecutor.initialize();
          const status = await migrationExecutor.getMigrationStatus();
          
          console.log(chalk.green('\n Executed Migrations:'));
          if (status.executed.length === 0) {
            console.log(chalk.gray('  No migrations executed yet'));
          } else {
            status.executed.forEach(migration => {
              console.log(`  ✓ ${migration.filename} - ${migration.description}`);
              console.log(chalk.gray(`    Executed: ${migration.executedAt}`));
            });
          }
          
          console.log(chalk.yellow('\n Pending Migrations:'));
          if (status.pending.length === 0) {
            console.log(chalk.gray('  No pending migrations'));
          } else {
            status.pending.forEach(filename => {
              console.log(` ${filename}`);
            });
            console.log(chalk.cyan(`\nRun 'db-agent migrations run' to execute pending migrations`));
          }
          
        } catch (error) {
          logger.error(`Migration status check failed: ${error instanceof Error ? error.message : String(error)}`);
          console.log(chalk.yellow('\n  Setup Required:'));
          console.log('1. Ensure Supabase is configured with proper environment variables');
          console.log('2. Run cli/utils/supabase-functions.sql in your Supabase SQL editor');
          console.log('3. Set SUPABASE_SERVICE_ROLE_KEY for full functionality');
        }
      })
  )
  .addCommand(
    new Command('run')
      .description('Execute pending migrations')
      .option('-f, --force', 'Force execution even if some validations fail')
      .action(async (options) => {
        console.log(chalk.blue.bold(' Executing Migrations'));
        
        const migrationExecutor = new MigrationExecutor();
        
        try {
          await migrationExecutor.initialize();
          const status = await migrationExecutor.getMigrationStatus();
          
          if (status.pending.length === 0) {
            console.log(chalk.green(' No pending migrations to execute'));
            return;
          }
          
          // Resolve migration file paths
          const migrationDirs = ['src/lib/migrations', 'supabase/migrations', 'migrations'];
          const migrationPaths: string[] = [];
          
          for (const filename of status.pending) {
            let found = false;
            for (const dir of migrationDirs) {
              const fullPath = path.join(process.cwd(), dir, filename);
              try {
                await fs.access(fullPath);
                migrationPaths.push(fullPath);
                found = true;
                break;
              } catch {
                // File doesn't exist in this directory
              }
            }
            if (!found) {
              logger.warn(`Migration file not found: ${filename}`);
            }
          }
          
          if (migrationPaths.length === 0) {
            logger.error('No migration files found to execute');
            return;
          }
          
          // Execute migrations
          const results = await migrationExecutor.executeMigrations(migrationPaths);
          
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          if (failed === 0) {
            console.log(chalk.green(`\n Successfully executed ${successful} migration(s)`));
          } else {
            console.log(chalk.red(`\n ${failed} migration(s) failed, ${successful} succeeded`));
            process.exit(1);
          }
          
        } catch (error) {
          logger.error(`Migration execution failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('rollback')
      .description('Rollback the last migration')
      .argument('<filename>', 'Migration filename to rollback')
      .action(async (filename) => {
        console.log(chalk.blue.bold(` Rolling back migration: ${filename}`));
        
        const migrationExecutor = new MigrationExecutor();
        
        try {
          await migrationExecutor.initialize();
          const success = await migrationExecutor.rollbackMigration(filename);
          
          if (success) {
            console.log(chalk.green(' Migration rolled back successfully'));
          } else {
            console.log(chalk.red(' Rollback failed'));
            process.exit(1);
          }
          
        } catch (error) {
          logger.error(`Rollback failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('debug')
      .description('Debug migration parsing without executing')
      .argument('<filename>', 'Migration filename to debug')
      .action(async (filename) => {
        console.log(chalk.blue.bold(` Debugging migration: ${filename}`));
        
        const migrationExecutor = new MigrationExecutor();
        
        try {
          // Find the migration file
          const migrationDirs = ['src/lib/migrations', 'supabase/migrations', 'migrations'];
          let migrationPath = '';
          
          for (const dir of migrationDirs) {
            const fullPath = path.join(process.cwd(), dir, filename);
            try {
              await fs.access(fullPath);
              migrationPath = fullPath;
              break;
            } catch {
              // File doesn't exist in this directory
            }
          }
          
          if (!migrationPath) {
            logger.error(`Migration file not found: ${filename}`);
            process.exit(1);
          }
          
          // Read and parse the migration file
          const migrationSql = await fs.readFile(migrationPath, 'utf8');
          console.log(chalk.gray(`\n Migration file: ${migrationPath}`));
          console.log(chalk.gray(` File size: ${migrationSql.length} characters`));
          
          // Parse without executing
          const { statements, tablesCreated, rollbackSql } = await (migrationExecutor as any).parseMigrationSql(migrationSql);
          
          console.log(chalk.green(`\n Parsing Results:`));
          console.log(`- Statements parsed: ${statements.length}`);
          console.log(`- Tables to create: ${tablesCreated.join(', ') || 'none'}`);
          console.log(`- Rollback SQL generated: ${rollbackSql ? 'Yes' : 'No'}`);
          
          console.log(chalk.yellow(`\n Parsed Statements:`));
          statements.forEach((stmt: string, i: number) => {
            const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
            console.log(`${i + 1}. ${preview}${stmt.length > 100 ? '...' : ''}`);
          });
          
          if (rollbackSql) {
            console.log(chalk.cyan(`\n Generated Rollback SQL:`));
            console.log(rollbackSql);
          }
          
        } catch (error) {
          logger.error(`Debug failed: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      })
  );

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
    console.log(chalk.white('  db-agent migrations status'));
    console.log(chalk.white('  db-agent migrations run'));
    console.log(chalk.white('  db-agent migrations debug migration-file.sql'));
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
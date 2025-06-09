#!/usr/bin/env node

/**
 * TaskHero Configuration Migration Command
 * Migrates configuration from .taskmaster/config.json to database
 */

import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { migrateConfigToDatabase, checkMigrationStatus, initializeDefaultConfigurations } from '../../api/utils/config-migration.js';
import { runDatabaseMigrations, checkDatabaseMigrationStatus } from '../../api/utils/database-migration.js';

const program = new Command();

program
  .name('migrate-config')
  .description('Migrate TaskHero configuration from file to database')
  .option('--check', 'Check migration status without performing migration')
  .option('--force', 'Force migration even if database already has configurations')
  .option('--init-defaults', 'Initialize default configurations only')
  .option('--db-schema', 'Migrate database schema only')
  .action(async (options) => {
    try {
      const projectRoot = process.cwd();

      console.log(boxen(
        chalk.blue.bold('TaskHero Configuration Migration'),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'blue'
        }
      ));

      // Check database schema migration status
      if (options.dbSchema || options.check) {
        console.log(chalk.yellow('🔍 Checking database schema migration status...'));
        const dbStatus = await checkDatabaseMigrationStatus(projectRoot);
        
        if (dbStatus.needsMigration) {
          console.log(chalk.red('❌ Database schema needs migration'));
          console.log('Current schema:', dbStatus.currentSchema);
          console.log('Recommended actions:', dbStatus.recommendedActions);
          
          if (!options.check) {
            console.log(chalk.yellow('🔄 Running database schema migration...'));
            const dbMigration = await runDatabaseMigrations(projectRoot);
            
            if (dbMigration.success) {
              console.log(chalk.green('✅ Database schema migration completed'));
            } else {
              console.log(chalk.red('❌ Database schema migration failed'));
              console.error(dbMigration.error);
              process.exit(1);
            }
          }
        } else {
          console.log(chalk.green('✅ Database schema is up to date'));
        }

        if (options.dbSchema) {
          return;
        }
      }

      // Check configuration migration status
      if (options.check) {
        console.log(chalk.yellow('🔍 Checking configuration migration status...'));
        const status = await checkMigrationStatus(projectRoot);
        
        console.log('\n' + boxen(
          `Migration Status: ${status.needsMigration ? chalk.red('NEEDED') : chalk.green('NOT NEEDED')}\n` +
          `Config File: ${status.hasConfigFile ? chalk.green('EXISTS') : chalk.red('NOT FOUND')}\n` +
          `Database Configs: ${status.existingDbConfigs || 0}\n` +
          `Config Path: ${status.configPath || 'N/A'}`,
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: status.needsMigration ? 'red' : 'green'
          }
        ));
        
        return;
      }

      // Initialize default configurations only
      if (options.initDefaults) {
        console.log(chalk.yellow('🔄 Initializing default configurations...'));
        const result = await initializeDefaultConfigurations();
        
        if (result.success) {
          console.log(chalk.green(`✅ Initialized ${result.initializedCount} default configurations`));
          console.log('\nConfigurations:');
          result.configurations.forEach(config => {
            console.log(`  ${chalk.blue(config.type)}.${chalk.cyan(config.key)}`);
          });
        } else {
          console.log(chalk.red('❌ Failed to initialize default configurations'));
          console.error(result.error);
          process.exit(1);
        }
        
        return;
      }

      // Check if migration is needed
      const status = await checkMigrationStatus(projectRoot);
      
      if (!status.needsMigration && !options.force) {
        console.log(chalk.green('✅ Configuration already migrated to database'));
        console.log(`Database has ${status.existingDbConfigs} configurations`);
        return;
      }

      if (!status.hasConfigFile && !options.force) {
        console.log(chalk.yellow('⚠️  No configuration file found'));
        console.log('Use --init-defaults to create default configurations');
        return;
      }

      // Perform migration
      console.log(chalk.yellow('🔄 Migrating configuration from file to database...'));
      const result = await migrateConfigToDatabase(projectRoot);
      
      if (result.success) {
        console.log(chalk.green(`✅ Successfully migrated ${result.migratedCount} configurations`));
        
        console.log('\n' + boxen(
          'Migration Summary:\n' +
          result.configurations.map(config => 
            `${chalk.blue(config.type)}.${chalk.cyan(config.key)} - ${config.migrated ? chalk.green('✓') : chalk.red('✗')}`
          ).join('\n'),
          {
            padding: 1,
            borderStyle: 'round',
            borderColor: 'green'
          }
        ));
        
        console.log(chalk.gray(`Source file: ${result.sourceFile}`));
      } else {
        console.log(chalk.red('❌ Configuration migration failed'));
        console.error(result.error);
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('❌ Migration failed:'), error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

export default program;

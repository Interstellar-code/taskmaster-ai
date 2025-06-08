/**
 * Database Backup and Restore Utilities for TaskHero
 * Handles automated backups, manual backups, and restore operations
 */

import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import databaseManager from './database.js';
import ProjectDAO from '../dao/ProjectDAO.js';

const copyFile = promisify(fs.copyFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

export class BackupManager {
  constructor() {
    this.maxBackups = 7; // Default maximum number of backups to keep
  }

  /**
   * Create a backup of the database
   * @param {string} projectRoot - Project root directory
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(projectRoot, options = {}) {
    try {
      const dbPath = databaseManager.getDatabasePath(projectRoot);
      const backupDir = path.join(projectRoot, '.taskmaster', 'backups');
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupType = options.type || 'manual';
      const backupFilename = `taskhero-${backupType}-${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFilename);

      // Check if database exists
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file not found');
      }

      // Create backup by copying the database file
      await copyFile(dbPath, backupPath);

      // Get backup file size
      const backupStats = await stat(backupPath);
      
      // Create backup metadata
      const metadata = {
        filename: backupFilename,
        path: backupPath,
        size: backupStats.size,
        created_at: new Date().toISOString(),
        type: backupType,
        project_root: projectRoot,
        database_stats: await databaseManager.getStats()
      };

      // Save metadata file
      const metadataPath = path.join(backupDir, `${backupFilename}.meta.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`Backup created: ${backupFilename} (${this.formatFileSize(backupStats.size)})`);

      // Clean up old backups if needed
      if (options.cleanup !== false) {
        await this.cleanupOldBackups(backupDir, options.maxBackups || this.maxBackups);
      }

      return {
        success: true,
        backup: metadata
      };

    } catch (error) {
      console.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   * @param {string} projectRoot - Project root directory
   * @param {string} backupFilename - Backup filename to restore
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(projectRoot, backupFilename) {
    try {
      const dbPath = databaseManager.getDatabasePath(projectRoot);
      const backupDir = path.join(projectRoot, '.taskmaster', 'backups');
      const backupPath = path.join(backupDir, backupFilename);
      const metadataPath = path.join(backupDir, `${backupFilename}.meta.json`);

      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFilename}`);
      }

      // Load backup metadata
      let metadata = {};
      if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      }

      // Create a backup of current database before restore
      const preRestoreBackup = await this.createBackup(projectRoot, {
        type: 'pre-restore',
        cleanup: false
      });

      // Close current database connection
      await databaseManager.close();

      // Restore the backup
      await copyFile(backupPath, dbPath);

      // Reinitialize database connection
      await databaseManager.initialize(projectRoot);

      console.log(`Database restored from backup: ${backupFilename}`);

      return {
        success: true,
        restored_backup: metadata,
        pre_restore_backup: preRestoreBackup.backup
      };

    } catch (error) {
      console.error('Backup restore failed:', error);
      throw error;
    }
  }

  /**
   * List available backups
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<Array>} Array of backup information
   */
  async listBackups(projectRoot) {
    try {
      const backupDir = path.join(projectRoot, '.taskmaster', 'backups');
      
      if (!fs.existsSync(backupDir)) {
        return [];
      }

      const files = await readdir(backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.db')) {
          const backupPath = path.join(backupDir, file);
          const metadataPath = path.join(backupDir, `${file}.meta.json`);
          
          const stats = await stat(backupPath);
          
          let metadata = {
            filename: file,
            size: stats.size,
            created_at: stats.mtime.toISOString(),
            type: 'unknown'
          };

          // Load metadata if available
          if (fs.existsSync(metadataPath)) {
            try {
              const metaData = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              metadata = { ...metadata, ...metaData };
            } catch (e) {
              console.warn(`Failed to load metadata for ${file}`);
            }
          }

          backups.push(metadata);
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return backups;

    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  /**
   * Delete a backup
   * @param {string} projectRoot - Project root directory
   * @param {string} backupFilename - Backup filename to delete
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteBackup(projectRoot, backupFilename) {
    try {
      const backupDir = path.join(projectRoot, '.taskmaster', 'backups');
      const backupPath = path.join(backupDir, backupFilename);
      const metadataPath = path.join(backupDir, `${backupFilename}.meta.json`);

      let deleted = false;

      // Delete backup file
      if (fs.existsSync(backupPath)) {
        await unlink(backupPath);
        deleted = true;
      }

      // Delete metadata file
      if (fs.existsSync(metadataPath)) {
        await unlink(metadataPath);
      }

      if (deleted) {
        console.log(`Backup deleted: ${backupFilename}`);
      }

      return deleted;

    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Clean up old backups, keeping only the specified number
   * @param {string} backupDir - Backup directory
   * @param {number} maxBackups - Maximum number of backups to keep
   * @returns {Promise<number>} Number of backups deleted
   */
  async cleanupOldBackups(backupDir, maxBackups = this.maxBackups) {
    try {
      const files = await readdir(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.db'));

      if (backupFiles.length <= maxBackups) {
        return 0; // No cleanup needed
      }

      // Get file stats and sort by modification time
      const fileStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await stat(filePath);
          return {
            filename: file,
            path: filePath,
            mtime: stats.mtime
          };
        })
      );

      // Sort by modification time (oldest first)
      fileStats.sort((a, b) => a.mtime - b.mtime);

      // Delete oldest backups
      const toDelete = fileStats.slice(0, fileStats.length - maxBackups);
      let deletedCount = 0;

      for (const file of toDelete) {
        try {
          await unlink(file.path);
          
          // Also delete metadata file if it exists
          const metadataPath = `${file.path}.meta.json`;
          if (fs.existsSync(metadataPath)) {
            await unlink(metadataPath);
          }
          
          deletedCount++;
          console.log(`Cleaned up old backup: ${file.filename}`);
        } catch (error) {
          console.warn(`Failed to delete backup ${file.filename}:`, error.message);
        }
      }

      return deletedCount;

    } catch (error) {
      console.error('Backup cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic backups
   * @param {string} projectRoot - Project root directory
   * @param {Object} schedule - Backup schedule configuration
   * @returns {Promise<void>}
   */
  async scheduleBackups(projectRoot, schedule = {}) {
    // This is a placeholder for future implementation
    // In a real implementation, you might use node-cron or similar
    console.log('Automatic backup scheduling not yet implemented');
    
    // For now, just create a daily backup if none exists today
    const backups = await this.listBackups(projectRoot);
    const today = new Date().toDateString();
    
    const todayBackup = backups.find(backup => 
      new Date(backup.created_at).toDateString() === today &&
      backup.type === 'automatic'
    );

    if (!todayBackup) {
      await this.createBackup(projectRoot, { type: 'automatic' });
    }
  }

  /**
   * Get backup statistics
   * @param {string} projectRoot - Project root directory
   * @returns {Promise<Object>} Backup statistics
   */
  async getBackupStats(projectRoot) {
    try {
      const backups = await this.listBackups(projectRoot);
      
      const stats = {
        total_backups: backups.length,
        total_size: backups.reduce((sum, backup) => sum + backup.size, 0),
        oldest_backup: backups.length > 0 ? backups[backups.length - 1].created_at : null,
        newest_backup: backups.length > 0 ? backups[0].created_at : null,
        by_type: {}
      };

      // Group by type
      backups.forEach(backup => {
        if (!stats.by_type[backup.type]) {
          stats.by_type[backup.type] = 0;
        }
        stats.by_type[backup.type]++;
      });

      return stats;

    } catch (error) {
      console.error('Failed to get backup stats:', error);
      throw error;
    }
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

// Export singleton instance
export default new BackupManager();

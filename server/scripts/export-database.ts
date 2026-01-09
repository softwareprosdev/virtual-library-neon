import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

async function exportDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Exporting database...');
  console.log(`📁 Backup file: ${backupFile}`);

  try {
    // Use pg_dump to export the database
    const { stdout, stderr } = await execAsync(
      `pg_dump "${databaseUrl}" --no-owner --no-acl -f "${backupFile}"`
    );

    if (stderr && !stderr.includes('warning')) {
      console.error('⚠️ Warnings during export:', stderr);
    }

    console.log('✅ Database exported successfully!');
    console.log(`📊 File size: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`\n📝 Backup location: ${backupFile}`);

    return backupFile;
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  }
}

exportDatabase().catch(console.error);

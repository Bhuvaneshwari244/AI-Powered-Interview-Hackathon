import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../config/database';

const runMigration = async () => {
  try {
    console.log('🔄 Running database migrations...');

    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

    await pool.query(schemaSQL);

    console.log('✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigration();

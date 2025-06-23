import knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  throw new Error(`No database configuration found for environment: ${environment}`);
}

const db = knex(config);

export const setupDatabase = async () => {
  try {
    // Test the database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Run migrations
    await db.migrate.latest();
    console.log('✅ Database migrations completed');
    
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export default db;
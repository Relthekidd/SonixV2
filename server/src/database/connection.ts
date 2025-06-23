import knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment as keyof typeof knexConfig];

export const db = knex(config);

export const setupDatabase = async () => {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Run migrations
    await db.migrate.latest();
    console.log('✅ Database migrations completed');
    
    // Run seeds in development
    if (environment === 'development') {
      await db.seed.run();
      console.log('✅ Database seeded successfully');
    }
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
};

export default db;
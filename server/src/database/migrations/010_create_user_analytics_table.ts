import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_analytics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('action').notNullable();
    table.json('metadata').defaultTo('{}');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
    table.index(['action']);
    table.index(['timestamp']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_analytics');
}
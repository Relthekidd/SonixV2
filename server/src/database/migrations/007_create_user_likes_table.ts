import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_likes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('track_id').references('id').inTable('tracks').onDelete('CASCADE');
    table.timestamp('liked_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'track_id']);
    table.index(['user_id']);
    table.index(['track_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_likes');
}
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('play_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('track_id').references('id').inTable('tracks').onDelete('CASCADE');
    table.timestamp('played_at').defaultTo(knex.fn.now());
    table.integer('play_duration'); // in seconds
    table.boolean('completed').defaultTo(false);
    table.string('device_type');
    table.string('ip_address');
    
    table.index(['user_id']);
    table.index(['track_id']);
    table.index(['played_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('play_history');
}
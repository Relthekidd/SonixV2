import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('playlist_tracks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('playlist_id').references('id').inTable('playlists').onDelete('CASCADE');
    table.uuid('track_id').references('id').inTable('tracks').onDelete('CASCADE');
    table.uuid('added_by').references('id').inTable('users').onDelete('CASCADE');
    table.integer('position').notNullable();
    table.timestamp('added_at').defaultTo(knex.fn.now());
    
    table.unique(['playlist_id', 'track_id']);
    table.index(['playlist_id']);
    table.index(['track_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('playlist_tracks');
}
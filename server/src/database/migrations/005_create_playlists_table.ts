import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('playlists', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('cover_url');
    table.boolean('is_public').defaultTo(true);
    table.boolean('is_collaborative').defaultTo(false);
    table.integer('total_tracks').defaultTo(0);
    table.integer('total_duration').defaultTo(0); // in seconds
    table.integer('follower_count').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['name']);
    table.index(['is_public']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('playlists');
}
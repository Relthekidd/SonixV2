import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('albums', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').references('id').inTable('artists').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description');
    table.string('cover_url');
    table.enum('type', ['album', 'ep', 'single']).defaultTo('album');
    table.json('genres').defaultTo('[]');
    table.date('release_date');
    table.boolean('is_published').defaultTo(false);
    table.integer('total_tracks').defaultTo(0);
    table.integer('total_duration').defaultTo(0); // in seconds
    table.integer('play_count').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['artist_id']);
    table.index(['title']);
    table.index(['release_date']);
    table.index(['is_published']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('albums');
}
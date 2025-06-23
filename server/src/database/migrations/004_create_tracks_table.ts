import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('tracks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('artist_id').references('id').inTable('artists').onDelete('CASCADE');
    table.uuid('album_id').references('id').inTable('albums').onDelete('SET NULL').nullable();
    table.string('title').notNullable();
    table.text('lyrics');
    table.string('audio_url').notNullable();
    table.string('cover_url');
    table.integer('duration').notNullable(); // in seconds
    table.integer('track_number');
    table.json('genres').defaultTo('[]');
    table.json('featured_artists').defaultTo('[]');
    table.boolean('is_explicit').defaultTo(false);
    table.boolean('is_published').defaultTo(false);
    table.integer('play_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.decimal('price', 8, 2).defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['artist_id']);
    table.index(['album_id']);
    table.index(['title']);
    table.index(['is_published']);
    table.index(['play_count']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('tracks');
}
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('artists', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('stage_name').notNullable();
    table.text('bio');
    table.string('avatar_url');
    table.string('banner_url');
    table.json('genres').defaultTo('[]');
    table.json('social_links').defaultTo('{}');
    table.boolean('is_verified').defaultTo(false);
    table.integer('monthly_listeners').defaultTo(0);
    table.integer('total_plays').defaultTo(0);
    table.timestamps(true, true);
    
    table.index(['user_id']);
    table.index(['stage_name']);
    table.index(['is_verified']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('artists');
}
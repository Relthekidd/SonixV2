import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('user_follows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('follower_id').references('id').inTable('users').onDelete('CASCADE');
    table.uuid('following_id').references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('followed_at').defaultTo(knex.fn.now());
    
    table.unique(['follower_id', 'following_id']);
    table.index(['follower_id']);
    table.index(['following_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user_follows');
}
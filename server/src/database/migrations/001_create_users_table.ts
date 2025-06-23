import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('password_hash').notNullable();
    table.string('display_name').notNullable();
    table.string('first_name');
    table.string('last_name');
    table.string('avatar_url');
    table.text('bio');
    table.enum('role', ['listener', 'artist', 'admin']).defaultTo('listener');
    table.boolean('is_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_public').defaultTo(true);
    table.json('preferences').defaultTo('{}');
    table.timestamp('last_login_at');
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['role']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
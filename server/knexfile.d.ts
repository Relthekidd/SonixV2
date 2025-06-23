import { Knex } from 'knex';

declare const config: {
  development: Knex.Config;
  staging: Knex.Config;
  production: Knex.Config;
};

export = config;
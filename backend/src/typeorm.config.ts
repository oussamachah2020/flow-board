import dotenv from 'dotenv';

import { ENV_FILE_PATHS } from './config/env-paths';
import { DataSource } from 'typeorm';

// Same precedence as ConfigModule: first file in ENV_FILE_PATHS wins (load in reverse so later overwrites)
[...ENV_FILE_PATHS].reverse().forEach((path) => dotenv.config({ path }));

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  entities: [__dirname + '/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
});

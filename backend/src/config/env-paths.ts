import { join } from 'path';

/**
 * Env file load order for @nestjs/config and TypeORM CLI.
 * Resolved relative to the backend project root so env files are found
 * regardless of process cwd (e.g. when running from monorepo root).
 * First file wins (per https://docs.nestjs.com/techniques/configuration#custom-env-file-path).
 */
const backendRoot = join(__dirname, '..', '..');
export const ENV_FILE_PATHS = [
  join(backendRoot, '.env.local'),
  join(backendRoot, '.env'),
];

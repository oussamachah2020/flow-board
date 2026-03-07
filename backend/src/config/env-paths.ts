/**
 * Env file load order for @nestjs/config and TypeORM CLI.
 * First file wins (per https://docs.nestjs.com/techniques/configuration#custom-env-file-path).
 */
export const ENV_FILE_PATHS = ['.env.local', '.env'];

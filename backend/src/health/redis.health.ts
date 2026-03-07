import { ConfigService } from '@nestjs/config';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { createClient } from 'redis';
import { Injectable } from '@nestjs/common';

type RedisClient = ReturnType<typeof createClient>;

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const url = this.configService.getOrThrow<string>('REDIS_URL');
    let client: RedisClient | null = null;

    try {
      client = createClient({ url });
      await client.connect();
      await client.ping();
      return this.getStatus(key, true, { response: 'pong' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message }),
      );
    } finally {
      if (client?.isOpen) {
        await client.quit();
      }
    }
  }
}

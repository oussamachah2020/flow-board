import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { AllExceptionsFilter } from './../src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('ValidationPipe', () => {
    it('rejects request with unknown property (forbidNonWhitelisted)', () => {
      return request(app.getHttpServer())
        .post('/test-validation')
        .send({ name: 'ok', unknownField: 'should be rejected' })
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: expect.any(String),
            timestamp: expect.any(String),
            path: '/test-validation',
          });
          expect(res.body.message.toLowerCase()).toMatch(
            /unknown|should not exist|forbidnonwhitelisted/,
          );
        });
    });

    it('accepts request with only whitelisted property', () => {
      return request(app.getHttpServer())
        .post('/test-validation')
        .send({ name: 'allowed' })
        .expect(200)
        .expect({ name: 'allowed' });
    });
  });
});

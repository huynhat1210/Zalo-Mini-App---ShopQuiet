import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestModule } from './test.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/auth/login (POST)', () => {
    it('should fail with missing zaloId', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          name: 'Test User',
        })
        .expect(400);
    });

    it('should fail with missing name', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          zaloId: '123456',
        })
        .expect(400);
    });
  });

  describe('/auth/verify (POST)', () => {
    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .send({ token: 'invalid-token' })
        .expect(401);
    });

    it('should fail with missing token', () => {
      return request(app.getHttpServer())
        .post('/auth/verify')
        .send({})
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    it('should fail without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

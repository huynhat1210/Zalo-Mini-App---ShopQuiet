import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TestModule } from './test.module';

describe('FavoritesController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/favorites (GET)', () => {
    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/favorites')
        .set('x-zalo-user-id', '123456')
        .expect(401);
    });
  });

  describe('/favorites (POST)', () => {
    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/favorites')
        .set('x-zalo-user-id', '123456')
        .send({ productId: 1 })
        .expect(401);
    });
  });

  describe('/favorites/:productId (DELETE)', () => {
    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete('/favorites/1')
        .set('x-zalo-user-id', '123456')
        .expect(401);
    });
  });
});

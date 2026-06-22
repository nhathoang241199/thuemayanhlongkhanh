import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';
import { getPublicApiUrl, getUploadDir } from './common/upload-config';

async function bootstrap() {
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.PUBLIC_API_URL?.trim()
  ) {
    console.warn(
      `[upload] PUBLIC_API_URL chưa đặt — dùng ${getPublicApiUrl()} cho URL ảnh CCCD. Nên đặt PUBLIC_API_URL=https://<domain> trong backend/.env`,
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.use(cookieParser());
  app.useStaticAssets(join(getUploadDir()), { prefix: '/api/uploads/' });
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3001',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Thuê máy ảnh Long Khánh API')
    .setDescription('REST API — Camera CRUD và các module khác')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

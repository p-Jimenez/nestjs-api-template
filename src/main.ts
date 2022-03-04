import { ValidationPipe, ForbiddenException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true
  }));

  const whitelist = [
    'http://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new ForbiddenException('Not allowed by CORS'));
      }
    },
    methods: 'GET,PUT,POST,DELETE',
  });

  await app.listen(8080);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = +(process.env.PORT || 4000);
  await app.listen(port);
  Logger.log(`🏥  Pharmacy backend running at http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Demo logins → admin / pharmacist / cashier / inventory / manager  (password: password123)`, 'Bootstrap');
}
bootstrap();

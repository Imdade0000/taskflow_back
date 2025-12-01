import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './filters/http-exception.filter';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('Mon API')
    .setDescription('Description de mon API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
 
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  
  const postmanCollection = SwaggerModule.createDocument(app, config, {
    extraModels: [],
    ignoreGlobalPrefix: false,
  });
  fs.writeFileSync('./postman-collection.json', JSON.stringify(postmanCollection));
  
   app.setGlobalPrefix('api'); // ← Préfixe global pour toutes les routes

  app.enableCors({
    origin: ['http://localhost:8100', 'http://localhost:4200'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true,
    }),
  );
  
  
  app.useGlobalFilters(new GlobalExceptionFilter());
  
 
  await app.listen(3000, '0.0.0.0'); // ← force IPv4


  console.log(`L'application est lancée sur: ${await app.getUrl()}`);
}

bootstrap();
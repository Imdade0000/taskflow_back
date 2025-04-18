import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
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

app.enableCors({
  origin: 'http://localhost:8100', 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});

fs.writeFileSync('./postman-collection.json', JSON.stringify(postmanCollection));

  app.useGlobalPipes(new ValidationPipe())
  await app.listen(process.env.PORT ?? 3000);


}
bootstrap();

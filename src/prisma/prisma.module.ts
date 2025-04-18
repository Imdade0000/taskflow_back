import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // pour rendre le config dispo partout
      envFilePath: '.env',
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = process.env.MOCK_PORT || 4001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Mock service running at http://localhost:${port}`);
}

bootstrap();

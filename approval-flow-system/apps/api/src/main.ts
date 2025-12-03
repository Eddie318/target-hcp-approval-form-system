import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 允许前端（PC 4173、H5 4174）联调跨域，如需收紧可调整 origin 列表
  // 开放本地跨域联调，如需收紧可改为白名单列表
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 避免缓存，特别是 mock-login 这类返回值容易被 304 缓存
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Approval Flow API")
    .setDescription("API documentation for approval flow system")
    .setVersion("0.1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      docExpansion: "list",
      cacheControl: "no-store",
    },
  });

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API running at http://localhost:${port}`);
}
bootstrap();

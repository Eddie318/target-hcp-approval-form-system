# Approval Flow System (阶段 1 环境与基础设施)

## 一键启动
```bash
cp .env.example .env
docker compose up --build
```
- API 默认端口：3000（容器内），对外见 compose 映射
- Mock 默认端口：4001（容器内）
- 健康检查：`/health`
- Swagger：`/api-docs`

## 本地开发（非 Docker）
```bash
npm install       # 根目录，安装工作区依赖
npm run lint
npm run test
npm run build
# 启动 api
cd apps/api && npm run start:dev
# 启动 mock
cd ../mock && npm run start:dev
```

## 环境变量
- 复制 `.env.example` 到 `.env`
- 关键变量：`APP_PORT`、`DATABASE_URL`、`MASTERDATA_BASE_URL`、`METRIC_BASE_URL`、`NOTIFICATION_BASE_URL`、企业微信 OAuth/短链签名。

## 目录结构
```
apps/
  api/      # NestJS API
  mock/     # Mock 服务
prisma/     # Prisma schema, migrations
scripts/    # 辅助脚本
.github/workflows/ci.yml
docker-compose.yml
docs/contracts.md
```

## CI
- GitHub Actions（.github/workflows/ci.yml）：checkout → setup Node 20 → install → lint/test/build（api+mock）。后续可加入 contract-test。

## 数据库
- PostgreSQL 由 docker-compose 提供，默认用户/库见 `.env.example`。Prisma 配置在 `prisma/schema.prisma`，后续阶段添加模型。

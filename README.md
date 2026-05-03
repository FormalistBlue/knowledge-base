# knowledge-base

部门内部轻量知识库平台，使用 Vue 3 + TypeScript + Express + Prisma + PostgreSQL 构建。

## 项目结构

```text
apps/web        Vue 3 frontend
apps/server     Express backend
packages/shared shared types and constants
docker/nginx    Nginx deployment config
```

## 本地开发

1. 安装依赖：

```bash
pnpm install
```

2. 准备环境变量：

```bash
cp .env.example .env
```

3. 启动 PostgreSQL：

```bash
sudo docker compose up -d postgres
```

4. 初始化数据库：

```bash
pnpm --filter server db:generate
pnpm --filter server db:migrate
pnpm --filter server db:seed
```

5. 启动开发服务：

```bash
pnpm dev:server
pnpm dev:web
```

## Docker Compose 生产部署

Docker 部署包含 3 个应用服务：

- `postgres`：PostgreSQL 数据库，数据写入 `postgres_data` volume。
- `server`：Express API 服务，上传文件写入 `uploads_data` volume。
- `web`：Nginx + 前端静态资源，同时把 `/api` 反向代理到 `server`。

### 1. 准备生产环境变量

```bash
cp .env.example .env
```

至少修改这些值：

```text
NODE_ENV=production
POSTGRES_PASSWORD=换成强密码
JWT_SECRET=至少 32 位随机字符串
CORS_ORIGIN=http://你的服务器地址:8080
WEB_PORT=8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=换成初始管理员强密码
ADMIN_DISPLAY_NAME=管理员
```

说明：

- `DATABASE_URL` 在 Docker Compose 中由 compose 自动按 `postgres` 服务名生成，通常不用手动改。
- `UPLOAD_DIR` 在容器内固定为 `/app/data/uploads`，并挂载到 `uploads_data` volume。
- `MAX_UPLOAD_SIZE_MB` 默认 50，Nginx `client_max_body_size` 也配置为 50m。

### 2. 构建并启动服务

```bash
sudo docker compose up -d --build
sudo docker compose ps
```

正常情况下，`postgres`、`server`、`web` 都应为 healthy。

### 3. 执行数据库迁移和初始化数据

首次部署或模型变更后运行：

```bash
sudo docker compose exec server npm --prefix apps/server run db:deploy
sudo docker compose exec server npm --prefix apps/server run seed:prod
```

seed 脚本会创建初始管理员、基础分类和基础标签。如果管理员已存在，不会重复创建。

### 4. 验证服务

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health
```

浏览器访问：

```text
http://服务器地址:8080
```

## HTTPS

如果有域名和证书：

1. 把证书放到主机目录，例如 `docker/nginx/certs/fullchain.pem` 和 `docker/nginx/certs/privkey.pem`。
2. 在 `.env` 中设置：

```text
HTTPS_CERT_DIR=./docker/nginx/certs
CORS_ORIGIN=https://你的域名
```

3. 在 `docker/nginx/nginx.conf` 中按注释启用 HTTPS server block。
4. 在 `docker-compose.yml` 的 `web` 服务 ports 中增加：

```yaml
- "443:443"
```

5. 重建并启动：

```bash
sudo docker compose up -d --build web
```

无域名的内网部署可以继续使用 HTTP。

## 常用运维命令

```bash
# 查看服务状态
sudo docker compose ps

# 查看日志
sudo docker compose logs -f server
sudo docker compose logs -f web
sudo docker compose logs -f postgres

# 重启服务
sudo docker compose restart server
sudo docker compose restart web

# 停止服务但保留数据 volume
sudo docker compose down

# 重新构建并启动
sudo docker compose up -d --build

# 执行数据库迁移
sudo docker compose exec server npm --prefix apps/server run db:deploy

# 执行 seed
sudo docker compose exec server npm --prefix apps/server run seed:prod
```

## 验证命令

```bash
pnpm --filter server typecheck
pnpm --filter server test
pnpm --filter server build
pnpm --filter web test
pnpm --filter web build
```

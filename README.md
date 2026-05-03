# knowledge-base

部门内部轻量知识库平台，使用 Vue 3 + TypeScript + Express + Prisma + PostgreSQL 构建。

## 功能范围

第一版已经覆盖以下主流程：

- 登录、当前用户信息、修改密码、旧 token 失效。
- 管理员创建用户、启用/禁用用户、重置密码、阻止最后一个管理员被禁用。
- 多级分类、标签去重、标签维护、文章草稿/发布/归档/删除。
- Markdown 编辑与详情页渲染，详情页渲染经过 DOMPurify XSS 清理。
- 图片和附件上传、预览、下载、文章绑定、临时文件清理。
- 搜索、分类/标签/时间筛选、点赞、收藏、浏览计数、评论、回复、通知。
- 后台用户/文章/分类/标签/评论管理、统计数据、审计日志。
- Docker Compose 部署：PostgreSQL + Express API + Nginx/Vue 前端。

## 项目结构

```text
apps/web        Vue 3 frontend
apps/server     Express backend
packages/shared shared types and constants
docker/nginx    Nginx deployment config
docs            project planning and acceptance docs
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

至少需要确认：

```text
DATABASE_URL=postgresql://kb_user:<DB_PASSWORD>@localhost:5432/knowledge_base
JWT_SECRET=<JWT_SECRET_AT_LEAST_32_CHARS>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<DEV_ADMIN_PASSWORD>
ADMIN_DISPLAY_NAME=管理员
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

本地访问：

```text
前端：http://localhost:5173
后端：http://localhost:3000/api/health
```

## 测试账号

seed 脚本只会创建 `.env` 中配置的初始管理员：

```text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<SET_STRONG_PASSWORD_IN_ENV>
ADMIN_DISPLAY_NAME=管理员
```

说明：

- README 不保存真实密码；交付或部署时请只从服务器 `.env` 查看或重置密码。
- 管理员登录后可以在后台创建普通成员账号。
- 如果忘记管理员密码，请在后台用另一个管理员账号重置；当前 seed 只会创建不存在的管理员，不会覆盖已有管理员密码。

## Docker Compose 生产部署

Docker 部署包含 3 个服务：

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
POSTGRES_PASSWORD=<POSTGRES_STRONG_PASSWORD>
JWT_SECRET=<JWT_SECRET_AT_LEAST_32_CHARS>
CORS_ORIGIN=http://你的服务器地址:8080
WEB_PORT=8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<ADMIN_STRONG_PASSWORD>
ADMIN_DISPLAY_NAME=管理员
```

说明：

- `DATABASE_URL` 在 Docker Compose 中由 compose 自动按 `postgres` 服务名生成，通常不用手动改。
- `UPLOAD_DIR` 在容器内固定为 `/app/data/uploads`，并挂载到 `uploads_data` volume。
- `MAX_UPLOAD_SIZE_MB` 默认 50，Nginx `client_max_body_size` 也配置为 50m。
- `CORS_ORIGIN` 生产环境建议填写最终访问地址；Docker 同源部署下通常填写前端域名或 `http://服务器地址:8080`。

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

seed 脚本会创建初始管理员、基础分类和基础标签；如果管理员已存在则不会覆盖密码，重复执行是安全的。

### 4. 验证服务

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/health
```

浏览器访问：

```text
http://服务器地址:8080
```

建议手动验证：登录管理员、创建普通用户、创建分类和标签、发布一篇知识、上传图片和附件、评论回复、查看通知、后台查看统计和审计。

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
DATABASE_URL=postgresql://kb_user:<DB_PASSWORD>@localhost:5432/knowledge_base JWT_SECRET=<JWT_SECRET_AT_LEAST_32_CHARS> pnpm --filter server test
DATABASE_URL=postgresql://kb_user:<DB_PASSWORD>@localhost:5432/knowledge_base JWT_SECRET=<JWT_SECRET_AT_LEAST_32_CHARS> pnpm --filter server typecheck
pnpm --filter server build
pnpm --filter web test
pnpm --filter web build
sudo env JWT_SECRET=<JWT_SECRET_AT_LEAST_32_CHARS> docker compose config
```

当前已知非阻塞提示：`pnpm --filter web build` 会提示主 chunk 超过 500 kB，构建成功；后续可以通过路由懒加载和代码分割优化。

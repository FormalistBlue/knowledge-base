import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';

import { errorHandler } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { validate } from './middlewares/validate.js';
import { adminCommentsRouter } from './modules/admin/comments.routes.js';
import { adminAuditLogsRouter, adminStatsRouter } from './modules/admin/stats.routes.js';
import { adminUsersRouter } from './modules/admin/users.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { adminKnowledgeRouter, commentsRouter, knowledgeRouter, meKnowledgeRouter, notificationsRouter } from './modules/knowledge/knowledge.routes.js';
import { adminCategoriesRouter, categoriesRouter } from './modules/taxonomy/categories.routes.js';
import { adminTagsRouter, tagsRouter } from './modules/taxonomy/tags.routes.js';
import { AppError } from './utils/app-error.js';
import { asyncHandler } from './utils/async-handler.js';
import { sendSuccess } from './utils/response.js';
import { env } from './config/env.js';

const parseCorsOrigin = (): CorsOptions['origin'] => {
  if (env.CORS_ORIGIN) {
    return env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);
  }
  return env.NODE_ENV === 'production' ? false : true;
};

export const createApp = () => {
  const app = express();

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: parseCorsOrigin() }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      service: 'knowledge-base-server',
      timestamp: new Date().toISOString(),
    });
  });

  app.get(
    '/api/health/db',
    asyncHandler(async (_req, res) => {
      const { prisma } = await import('./utils/prisma.js');
      await prisma.$queryRaw`SELECT 1`;
      sendSuccess(res, {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/tags', tagsRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/me', meKnowledgeRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/admin/users', adminUsersRouter);
  app.use('/api/admin/stats', adminStatsRouter);
  app.use('/api/admin/audit-logs', adminAuditLogsRouter);
  app.use('/api/admin/comments', adminCommentsRouter);
  app.use('/api/admin/knowledge', adminKnowledgeRouter);
  app.use('/api/admin/categories', adminCategoriesRouter);
  app.use('/api/admin/tags', adminTagsRouter);

  if (env.NODE_ENV !== 'production') {
    app.get(
      '/api/dev/validate-demo',
      validate({
        query: z.object({
          keyword: z.string().min(2),
        }),
      }),
      (req, res) => {
        sendSuccess(res, {
          keyword: req.query.keyword,
        });
      },
    );
  }

  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', '接口不存在', 404));
  });

  app.use(errorHandler);

  return app;
};

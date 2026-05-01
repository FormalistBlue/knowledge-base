import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';

import { errorHandler } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { validate } from './middlewares/validate.js';
import { adminUsersRouter } from './modules/admin/users.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import { adminKnowledgeRouter, knowledgeRouter } from './modules/knowledge/knowledge.routes.js';
import { adminCategoriesRouter, categoriesRouter } from './modules/taxonomy/categories.routes.js';
import { adminTagsRouter, tagsRouter } from './modules/taxonomy/tags.routes.js';
import { AppError } from './utils/app-error.js';
import { asyncHandler } from './utils/async-handler.js';
import { sendSuccess } from './utils/response.js';

export const createApp = () => {
  const app = express();

  app.use(requestLogger);
  app.use(helmet());
  app.use(cors());
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
  app.use('/api/files', filesRouter);
  app.use('/api/admin/users', adminUsersRouter);
  app.use('/api/admin/knowledge', adminKnowledgeRouter);
  app.use('/api/admin/categories', adminCategoriesRouter);
  app.use('/api/admin/tags', adminTagsRouter);

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

  app.use((_req, _res, next) => {
    next(new AppError('NOT_FOUND', '接口不存在', 404));
  });

  app.use(errorHandler);

  return app;
};

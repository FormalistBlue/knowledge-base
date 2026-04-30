/*
  Warnings:

  - You are about to drop the `HealthCheck` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AttachmentUsageType" AS ENUM ('IMAGE', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('TEMP', 'BOUND');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('KNOWLEDGE_COMMENTED', 'COMMENT_REPLIED', 'PASSWORD_RESET', 'KNOWLEDGE_UPDATED_BY_ADMIN');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE_USER', 'DISABLE_USER', 'ENABLE_USER', 'RESET_PASSWORD', 'DELETE_KNOWLEDGE', 'PIN_KNOWLEDGE', 'UPDATE_KNOWLEDGE_CATEGORY', 'UPDATE_KNOWLEDGE_TAGS', 'DELETE_COMMENT', 'DELETE_CATEGORY', 'DELETE_TAG');

-- DropTable
DROP TABLE "HealthCheck";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeTag" (
    "knowledgeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeTag_pkey" PRIMARY KEY ("knowledgeId","tagId")
);

-- CreateTable
CREATE TABLE "KnowledgeLike" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeFavorite" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeView" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT,
    "uploaderId" TEXT NOT NULL,
    "usageType" "AttachmentUsageType" NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'TEMP',
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "boundAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_parentId_name_key" ON "Category"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_normalizedName_key" ON "Tag"("normalizedName");

-- CreateIndex
CREATE INDEX "Tag_createdById_idx" ON "Tag"("createdById");

-- CreateIndex
CREATE INDEX "Tag_deletedAt_idx" ON "Tag"("deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeItem_status_idx" ON "KnowledgeItem"("status");

-- CreateIndex
CREATE INDEX "KnowledgeItem_categoryId_idx" ON "KnowledgeItem"("categoryId");

-- CreateIndex
CREATE INDEX "KnowledgeItem_authorId_idx" ON "KnowledgeItem"("authorId");

-- CreateIndex
CREATE INDEX "KnowledgeItem_isPinned_idx" ON "KnowledgeItem"("isPinned");

-- CreateIndex
CREATE INDEX "KnowledgeItem_publishedAt_idx" ON "KnowledgeItem"("publishedAt");

-- CreateIndex
CREATE INDEX "KnowledgeItem_updatedAt_idx" ON "KnowledgeItem"("updatedAt");

-- CreateIndex
CREATE INDEX "KnowledgeItem_deletedAt_idx" ON "KnowledgeItem"("deletedAt");

-- CreateIndex
CREATE INDEX "KnowledgeTag_tagId_idx" ON "KnowledgeTag"("tagId");

-- CreateIndex
CREATE INDEX "KnowledgeLike_userId_idx" ON "KnowledgeLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeLike_knowledgeId_userId_key" ON "KnowledgeLike"("knowledgeId", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeFavorite_userId_idx" ON "KnowledgeFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeFavorite_knowledgeId_userId_key" ON "KnowledgeFavorite"("knowledgeId", "userId");

-- CreateIndex
CREATE INDEX "KnowledgeView_userId_idx" ON "KnowledgeView"("userId");

-- CreateIndex
CREATE INDEX "KnowledgeView_viewDate_idx" ON "KnowledgeView"("viewDate");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeView_knowledgeId_userId_viewDate_key" ON "KnowledgeView"("knowledgeId", "userId", "viewDate");

-- CreateIndex
CREATE INDEX "Comment_knowledgeId_idx" ON "Comment"("knowledgeId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Comment_deletedAt_idx" ON "Comment"("deletedAt");

-- CreateIndex
CREATE INDEX "Attachment_knowledgeId_idx" ON "Attachment"("knowledgeId");

-- CreateIndex
CREATE INDEX "Attachment_uploaderId_idx" ON "Attachment"("uploaderId");

-- CreateIndex
CREATE INDEX "Attachment_usageType_idx" ON "Attachment"("usageType");

-- CreateIndex
CREATE INDEX "Attachment_status_idx" ON "Attachment"("status");

-- CreateIndex
CREATE INDEX "Attachment_deletedAt_idx" ON "Attachment"("deletedAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_deletedAt_idx" ON "Notification"("deletedAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTag" ADD CONSTRAINT "KnowledgeTag_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeTag" ADD CONSTRAINT "KnowledgeTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeLike" ADD CONSTRAINT "KnowledgeLike_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeLike" ADD CONSTRAINT "KnowledgeLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFavorite" ADD CONSTRAINT "KnowledgeFavorite_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeFavorite" ADD CONSTRAINT "KnowledgeFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeView" ADD CONSTRAINT "KnowledgeView_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeView" ADD CONSTRAINT "KnowledgeView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

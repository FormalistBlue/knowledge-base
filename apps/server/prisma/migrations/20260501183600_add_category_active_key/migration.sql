-- Use an application-maintained key so PostgreSQL can enforce uniqueness for root and child categories.
ALTER TABLE "Category" ADD COLUMN "activeKey" TEXT;

UPDATE "Category"
SET "activeKey" = CASE
  WHEN "deletedAt" IS NULL THEN COALESCE("parentId", '__ROOT__') || ':' || lower("name")
  ELSE 'deleted:' || "id"
END;

ALTER TABLE "Category" ALTER COLUMN "activeKey" SET NOT NULL;
DROP INDEX IF EXISTS "Category_parentId_name_key";
CREATE UNIQUE INDEX "Category_activeKey_key" ON "Category"("activeKey");

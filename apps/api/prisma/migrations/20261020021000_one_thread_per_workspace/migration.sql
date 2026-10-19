-- One conversation per workspace: enforce it at the database level.
-- The title column is gone too: the workspace title is the only title.
DROP INDEX "ChatThread_workspaceId_updatedAt_idx";
CREATE UNIQUE INDEX "ChatThread_workspaceId_key" ON "ChatThread"("workspaceId");
ALTER TABLE "ChatThread" DROP COLUMN "title";

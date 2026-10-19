-- The "Developed by" credit is now hardcoded in the web app
-- (apps/web/lib/site-config.ts) instead of being admin-editable, so the
-- stored columns are dropped.
ALTER TABLE "SiteSetting" DROP COLUMN "developedBy",
DROP COLUMN "developedByUrl";

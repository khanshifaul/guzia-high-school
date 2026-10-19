-- Admission options the school offers: which admission types are open, and
-- the shifts it runs (0-2 names). CSV keeps the admin editor to one line.
ALTER TABLE "SiteSetting" ADD COLUMN "admissionTypes" TEXT NOT NULL DEFAULT 'day,residential';
ALTER TABLE "SiteSetting" ADD COLUMN "shifts" TEXT NOT NULL DEFAULT 'Morning';

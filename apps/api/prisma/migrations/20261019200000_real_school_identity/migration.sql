-- Seed the real school identity into the public site settings.
-- Source: sohopathi.com/guzia-bilateral-high-school/ — EIIN 119825, founded
-- 01 January 1958 (recognised 01 July 1962), Rajshahi Education Board,
-- Union Guzia / Shibganj / Bogura, mobile 01713939240.
--
-- The column defaults change too, so a fresh database gets the same values.

-- AlterTable
ALTER TABLE "SiteSetting" ALTER COLUMN "schoolName" SET DEFAULT 'Guzia Bilateral High School';
ALTER TABLE "SiteSetting" ALTER COLUMN "schoolNameBn" SET DEFAULT 'গুজিয়া উচ্চ বিদ্যালয়';
ALTER TABLE "SiteSetting" ALTER COLUMN "phone" SET DEFAULT '01713939240';
ALTER TABLE "SiteSetting" ALTER COLUMN "eiin" SET DEFAULT '119825';
ALTER TABLE "SiteSetting" ALTER COLUMN "address" SET DEFAULT 'Union Guzia, Shibganj, Bogura';
ALTER TABLE "SiteSetting" ALTER COLUMN "addressBn" SET DEFAULT 'গুজিয়া ইউনিয়ন, শিবগঞ্জ, বগুড়া';
ALTER TABLE "SiteSetting" ALTER COLUMN "tagline" SET DEFAULT 'A combined secondary school in Guzia, Bogura — serving the community since 1958.';
ALTER TABLE "SiteSetting" ALTER COLUMN "taglineBn" SET DEFAULT '১৯৫৮ সাল থেকে বগুড়ার গুজিয়ায় প্রতিষ্ঠিত একটি সহ-শিক্ষা মাধ্যমিক বিদ্যালয়।';

-- The live singleton row (it is created on first read, so it usually exists).
UPDATE "SiteSetting" SET
  "schoolName"   = 'Guzia Bilateral High School',
  "schoolNameBn" = 'গুজিয়া উচ্চ বিদ্যালয়',
  "phone"        = '01713939240',
  "eiin"         = '119825',
  "address"      = 'Union Guzia, Shibganj, Bogura',
  "addressBn"    = 'গুজিয়া ইউনিয়ন, শিবগঞ্জ, বগুড়া',
  "tagline"      = 'A combined secondary school in Guzia, Bogura — serving the community since 1958.',
  "taglineBn"    = '১৯৫৮ সাল থেকে বগুড়ার গুজিয়ায় প্রতিষ্ঠিত একটি সহ-শিক্ষা মাধ্যমিক বিদ্যালয়।',
WHERE "id" = 'singleton';

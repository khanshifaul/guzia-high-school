-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT 'Guzia High School',
    "schoolNameBn" TEXT NOT NULL DEFAULT 'গুজিয়া উচ্চ বিদ্যালয়',
    "phone" TEXT NOT NULL DEFAULT '+880 1711-000000',
    "hotline" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT 'info@guziahs.edu',
    "eiin" TEXT NOT NULL DEFAULT '123456',
    "board" TEXT NOT NULL DEFAULT 'Rajshahi Education Board',
    "address" TEXT NOT NULL DEFAULT 'Guzia, Bangladesh',
    "addressBn" TEXT NOT NULL DEFAULT 'গুজিয়া, বাংলাদেশ',
    "established" TEXT NOT NULL DEFAULT '1958',
    "tagline" TEXT NOT NULL DEFAULT 'Empowering students for academic excellence and lifelong success since 1958.',
    "taglineBn" TEXT NOT NULL DEFAULT '১৯৫৮ সাল থেকে শিক্ষার্থীদের একাডেমিক উৎকর্ষ ও জীবনব্যাপী সাফল্যের জন্য ক্ষমতায়ন।',
    "developedBy" TEXT NOT NULL DEFAULT 'Guzia School Portal',
    "facebookUrl" TEXT NOT NULL DEFAULT '',
    "twitterUrl" TEXT NOT NULL DEFAULT '',
    "instagramUrl" TEXT NOT NULL DEFAULT '',
    "youtubeUrl" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT NOT NULL DEFAULT '',
    "websiteUrl" TEXT NOT NULL DEFAULT '',
    "importantLinks" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

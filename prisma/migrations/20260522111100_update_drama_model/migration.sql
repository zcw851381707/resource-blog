/*
  Warnings:

  - You are about to drop the column `airDay` on the `Drama` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Drama` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Drama" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "coverImage" TEXT,
    "description" TEXT,
    "isHot" BOOLEAN NOT NULL DEFAULT false,
    "isOnSchedule" BOOLEAN NOT NULL DEFAULT false,
    "isNewlyAired" BOOLEAN NOT NULL DEFAULT false,
    "isUpcoming" BOOLEAN NOT NULL DEFAULT false,
    "airDays" TEXT,
    "airTime" TEXT,
    "expectedDate" DATETIME,
    "totalEpisodes" INTEGER,
    "currentEpisode" INTEGER,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "resourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Drama_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Drama" ("airTime", "coverImage", "createdAt", "description", "expectedDate", "id", "resourceId", "slug", "sortOrder", "title", "updatedAt") SELECT "airTime", "coverImage", "createdAt", "description", "expectedDate", "id", "resourceId", "slug", "sortOrder", "title", "updatedAt" FROM "Drama";
DROP TABLE "Drama";
ALTER TABLE "new_Drama" RENAME TO "Drama";
CREATE UNIQUE INDEX "Drama_slug_key" ON "Drama"("slug");
CREATE UNIQUE INDEX "Drama_resourceId_key" ON "Drama"("resourceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

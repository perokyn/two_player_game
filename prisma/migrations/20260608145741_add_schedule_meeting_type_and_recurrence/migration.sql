-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Schedule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "counselorId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientNumber" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "meetingType" TEXT NOT NULL DEFAULT 'In Person',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceGroup" TEXT,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Schedule_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Schedule" ("clientName", "clientNumber", "comment", "counselorId", "createdAt", "endTime", "id", "startTime", "updatedAt") SELECT "clientName", "clientNumber", "comment", "counselorId", "createdAt", "endTime", "id", "startTime", "updatedAt" FROM "Schedule";
DROP TABLE "Schedule";
ALTER TABLE "new_Schedule" RENAME TO "Schedule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

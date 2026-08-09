-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "byeWeek" INTEGER NOT NULL,
    "yearInLeague" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,
    "contract" TEXT NOT NULL,
    "statsJson" TEXT NOT NULL,
    "fps2025" REAL NOT NULL,
    "ppg2025" REAL NOT NULL,
    "sos" INTEGER NOT NULL,
    "upside" INTEGER NOT NULL,
    "bustRisk" INTEGER NOT NULL,
    "offRating" REAL NOT NULL,
    "proj2026" REAL NOT NULL
);

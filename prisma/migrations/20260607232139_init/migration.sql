-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "lat" REAL,
    "lng" REAL
);

import pg from 'pg';

const { Client } = pg;

const migrationName = '20260429103000_v1_brownfield_conflict_resolution';
const tableName = 'DesignBrownfieldConflictResolution';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set; cannot inspect Prisma migration recovery state.');
  process.exit(2);
}

const client = new Client({ connectionString: databaseUrl });

async function one(query, params = []) {
  const result = await client.query(query, params);
  return result.rows[0] ?? null;
}

async function main() {
  await client.connect();

  const migrationsTable = await one(
    `SELECT to_regclass('public._prisma_migrations') AS regclass`
  );

  if (!migrationsTable?.regclass) {
    console.log('Prisma migrations table does not exist; skipping targeted brownfield recovery.');
    process.exit(2);
  }

  const failedMigration = await one(
    `SELECT migration_name, finished_at, rolled_back_at
       FROM "_prisma_migrations"
      WHERE migration_name = $1
      ORDER BY started_at DESC
      LIMIT 1`,
    [migrationName]
  );

  if (!failedMigration || failedMigration.finished_at || failedMigration.rolled_back_at) {
    console.log(`No unresolved failed Prisma migration found for ${migrationName}; skipping targeted recovery.`);
    process.exit(2);
  }

  const table = await one(
    `SELECT to_regclass('public."${tableName}"') AS regclass`
  );

  if (!table?.regclass) {
    console.log(`${tableName} does not exist yet; targeted relation-exists recovery is not applicable.`);
    process.exit(2);
  }

  console.log(`Recovering known V1 migration drift: ${migrationName}`);
  console.log(`${tableName} already exists, so adding any missing indexes/constraints idempotently before resolving migration history.`);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "DesignBrownfieldConflictResolution_projectId_conflictKey_key"
      ON "DesignBrownfieldConflictResolution"("projectId", "conflictKey");

    CREATE INDEX IF NOT EXISTS "DesignBrownfieldConflictResolution_projectId_idx"
      ON "DesignBrownfieldConflictResolution"("projectId");

    CREATE INDEX IF NOT EXISTS "DesignBrownfieldConflictResolution_decision_idx"
      ON "DesignBrownfieldConflictResolution"("decision");

    CREATE INDEX IF NOT EXISTS "DesignBrownfieldConflictResolution_designInputHash_idx"
      ON "DesignBrownfieldConflictResolution"("designInputHash");

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'DesignBrownfieldConflictResolution_projectId_fkey'
           AND conrelid = 'public."DesignBrownfieldConflictResolution"'::regclass
      ) THEN
        ALTER TABLE "DesignBrownfieldConflictResolution"
          ADD CONSTRAINT "DesignBrownfieldConflictResolution_projectId_fkey"
          FOREIGN KEY ("projectId") REFERENCES "Project"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  console.log('Known V1 brownfield migration drift recovered.');
}

main()
  .catch((error) => {
    console.error('Targeted brownfield migration recovery failed.');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await client.end();
    } catch {
      // Ignore shutdown errors.
    }
  });

require("dotenv").config();
const pool = require("./db");

async function migrate() {
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'flexible';
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIME;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIME;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_weekdays TEXT;
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS skipped_dates TEXT NOT NULL DEFAULT '[]';
  `);

  console.log("Migration 2 complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

require("dotenv").config();
const pool = require("./db");

async function migrate() {
  await pool.query(`
    ALTER TABLE tasks      ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE schedules  ADD COLUMN IF NOT EXISTS user_id TEXT;
  `);
  console.log("Migration 5 complete: added user_id to tasks and schedules.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

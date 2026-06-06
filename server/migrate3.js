require("dotenv").config();
const pool = require("./db");

async function migrate() {
  await pool.query(`
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS
      parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
  `);
  console.log("Migration 3 complete.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

require("dotenv").config();
const pool = require("./db");

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id            SERIAL PRIMARY KEY,
      title         TEXT NOT NULL,
      notes         TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      due_date      DATE,
      recurrence    TEXT NOT NULL DEFAULT 'none',
      recurrence_days INTEGER,
      last_completed DATE,
      snooze_until  DATE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("Database is ready.");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

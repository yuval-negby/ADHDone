const { Pool, types } = require("pg");

// Return DATE columns as plain "YYYY-MM-DD" strings instead of
// Date objects. Without this, pg converts dates to UTC midnight
// which shifts the date backwards in timezones ahead of UTC.
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

module.exports = pool;

const express = require("express");
const router = express.Router();
const pool = require("../db");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/schedules/today
router.get("/today", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM schedules WHERE date = CURRENT_DATE AND user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch schedules." });
  }
});

// GET /api/schedules/month?year=YYYY&month=M
router.get("/month", async (req, res) => {
  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: "year and month are required." });
  const y = parseInt(year);
  const m = parseInt(month);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endY = m === 12 ? y + 1 : y;
  const endM = m === 12 ? 1 : m + 1;
  const end = `${endY}-${String(endM).padStart(2, "0")}-01`;
  try {
    const result = await pool.query(
      `SELECT * FROM schedules
       WHERE date >= $1 AND date < $2 AND user_id = $3
       ORDER BY date ASC, created_at DESC`,
      [start, end, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch schedules for month." });
  }
});

// GET /api/schedules/for-date?date=YYYY-MM-DD
router.get("/for-date", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date query param is required." });
  try {
    const result = await pool.query(
      "SELECT * FROM schedules WHERE date = $1 AND user_id = $2 ORDER BY created_at DESC",
      [date, req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch schedules for date." });
  }
});

// POST /api/schedules
router.post("/", async (req, res) => {
  const { mood, blocks, date } = req.body;
  if (!blocks || blocks.length === 0) {
    return res.status(400).json({ error: "Blocks are required." });
  }
  try {
    const result = await pool.query(
      "INSERT INTO schedules (date, mood, blocks, user_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [date || null, mood || null, JSON.stringify(blocks), req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to save schedule." });
  }
});

// PATCH /api/schedules/:id
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { blocks } = req.body;
  if (!blocks) return res.status(400).json({ error: "Blocks are required." });
  try {
    const result = await pool.query(
      "UPDATE schedules SET blocks = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(blocks), id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Schedule not found." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to update schedule." });
  }
});

// POST /api/schedules/adjust — stateless AI adjustment (unsaved schedules)
router.post("/adjust", async (req, res) => {
  const { instruction, blocks } = req.body;
  if (!instruction || !blocks) {
    return res.status(400).json({ error: "Instruction and blocks are required." });
  }

  const blocksSummary = blocks.map((b) =>
    `${b.start_time}–${b.end_time} | ${b.type} | ${b.title}${b.done ? " (done)" : ""}`
  ).join("\n");

  const prompt = `
You are an assistant helping someone with ADHD adjust their daily schedule.

Here is the current schedule:
${blocksSummary}

The user wants to make this adjustment:
"${instruction}"

Apply the requested change. Keep everything else as close to the original as possible.
Only modify what is necessary to fulfill the request.

Return the full updated schedule as a JSON array. Each block must have:
- "title": string
- "start_time": "HH:MM" (24h)
- "end_time": "HH:MM" (24h)
- "type": "fixed", "flexible", or "break"
- "tip": string (keep original tips where unchanged, empty string for breaks)
- "done": boolean (preserve existing done state)

Only return valid JSON. No extra text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });
    const raw = response.choices[0].message.content.trim();
    const json = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    res.json({ blocks: JSON.parse(json) });
  } catch (err) {
    console.error("Adjust error:", err.message);
    res.status(500).json({ error: "Failed to adjust schedule." });
  }
});

// POST /api/schedules/:id/adjust
router.post("/:id/adjust", async (req, res) => {
  const { id } = req.params;
  const { instruction, blocks } = req.body;
  if (!instruction || !blocks) {
    return res.status(400).json({ error: "Instruction and blocks are required." });
  }

  const blocksSummary = blocks.map((b) =>
    `${b.start_time}–${b.end_time} | ${b.type} | ${b.title}${b.done ? " (done)" : ""}`
  ).join("\n");

  const prompt = `
You are an assistant helping someone with ADHD adjust their daily schedule.

Here is the current schedule:
${blocksSummary}

The user wants to make this adjustment:
"${instruction}"

Apply the requested change. Keep everything else as close to the original as possible.
Only modify what is necessary to fulfill the request.

Return the full updated schedule as a JSON array. Each block must have:
- "title": string
- "start_time": "HH:MM" (24h)
- "end_time": "HH:MM" (24h)
- "type": "fixed", "flexible", or "break"
- "tip": string (keep original tips where unchanged, empty string for breaks)
- "done": boolean (preserve existing done state)

Only return valid JSON. No extra text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });
    const raw = response.choices[0].message.content.trim();
    const json = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const updated = JSON.parse(json);

    const result = await pool.query(
      "UPDATE schedules SET blocks = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(updated), id, req.user.id]
    );
    res.json({ blocks: updated, saved: result.rows.length > 0 });
  } catch (err) {
    console.error("Adjust error:", err.message);
    res.status(500).json({ error: "Failed to adjust schedule." });
  }
});

// DELETE /api/schedules/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM schedules WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Schedule not found." });
    res.json({ message: "Schedule deleted." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to delete schedule." });
  }
});

module.exports = router;

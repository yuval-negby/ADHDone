const express = require("express");
const router = express.Router();
const pool = require("../db");
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isScheduledOn(task, date) {
  const dayOfWeek = date.getDay();
  const dateStr = toLocalDateStr(date);
  const skipped = JSON.parse(task.skipped_dates || "[]");
  if (skipped.includes(dateStr)) return false;

  switch (task.recurrence) {
    case "none":
      return task.due_date &&
        new Date(task.due_date).toISOString().split("T")[0] === dateStr;
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekly": {
      const base = new Date(task.due_date || task.created_at);
      return base.getDay() === dayOfWeek;
    }
    case "custom": {
      const days = JSON.parse(task.recurrence_weekdays || "[]");
      return days.includes(dayOfWeek);
    }
    default:
      return false;
  }
}

// GET /api/tasks
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at ASC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch tasks." });
  }
});

// GET /api/tasks/today
router.get("/today", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE task_type = 'fixed' AND user_id = $1 ORDER BY start_time ASC",
      [req.user.id]
    );
    const today = new Date();
    res.json(result.rows.filter((t) => isScheduledOn(t, today)));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch today's tasks." });
  }
});

// GET /api/tasks/for-date?date=YYYY-MM-DD
router.get("/for-date", async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date query param is required." });
  try {
    const result = await pool.query(
      "SELECT * FROM tasks WHERE task_type = 'fixed' AND user_id = $1 ORDER BY start_time ASC",
      [req.user.id]
    );
    const target = new Date(date + "T12:00:00");
    res.json(result.rows.filter((t) => isScheduledOn(t, target)));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to fetch tasks for date." });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const {
    title, notes, due_date, recurrence, recurrence_days,
    task_type, start_time, end_time, recurrence_weekdays, priority,
  } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });

  try {
    const result = await pool.query(
      `INSERT INTO tasks
        (title, notes, due_date, recurrence, recurrence_days,
         task_type, start_time, end_time, recurrence_weekdays, priority, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        title, notes || null, due_date || null,
        recurrence || "none", recurrence_days || null,
        task_type || "flexible", start_time || null, end_time || null,
        recurrence_weekdays || null, priority || null,
        req.user.id,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to create task." });
  }
});

// POST /api/tasks/:id/skip
router.post("/:id/skip", async (req, res) => {
  const { id } = req.params;
  const todayStr = new Date().toISOString().split("T")[0];
  try {
    const existing = await pool.query(
      "SELECT skipped_dates FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Task not found." });

    const skipped = JSON.parse(existing.rows[0].skipped_dates || "[]");
    if (!skipped.includes(todayStr)) skipped.push(todayStr);

    const result = await pool.query(
      "UPDATE tasks SET skipped_dates = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [JSON.stringify(skipped), id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to skip task." });
  }
});

// PATCH /api/tasks/:id
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const {
    title, notes, due_date, recurrence, recurrence_days,
    status, snooze_until, last_completed,
    task_type, start_time, end_time, recurrence_weekdays, priority,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET
        title               = COALESCE($1,  title),
        notes               = COALESCE($2,  notes),
        due_date            = COALESCE($3,  due_date),
        recurrence          = COALESCE($4,  recurrence),
        recurrence_days     = COALESCE($5,  recurrence_days),
        status              = COALESCE($6,  status),
        snooze_until        = COALESCE($7,  snooze_until),
        last_completed      = COALESCE($8,  last_completed),
        task_type           = COALESCE($9,  task_type),
        start_time          = COALESCE($10, start_time),
        end_time            = COALESCE($11, end_time),
        recurrence_weekdays = COALESCE($12, recurrence_weekdays),
        priority            = COALESCE($13, priority)
       WHERE id = $14 AND user_id = $15
       RETURNING *`,
      [
        title, notes, due_date, recurrence, recurrence_days,
        status, snooze_until, last_completed,
        task_type, start_time, end_time, recurrence_weekdays, priority,
        id, req.user.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Task not found." });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to update task." });
  }
});

// POST /api/tasks/:id/breakdown
router.post("/:id/breakdown", async (req, res) => {
  const { id } = req.params;
  try {
    const taskResult = await pool.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (taskResult.rows.length === 0) return res.status(404).json({ error: "Task not found." });
    const task = taskResult.rows[0];

    const prompt = `
You are an assistant helping someone with ADHD manage a large task.

The task is: "${task.title}"
${task.notes ? `Additional context: "${task.notes}"` : ""}

Break this into smaller, concrete subtasks that can each be done in a single focused session (30–90 min max).
Each subtask should be specific and actionable — not vague like "work on it".
Return a JSON array. Each item has:
- "title": short action phrase starting with a verb
- "notes": one sentence of helpful context or clarification (can be empty string)

Only return valid JSON. No extra text.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = response.choices[0].message.content.trim();
    const json = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const subtasks = JSON.parse(json);

    await pool.query(
      "DELETE FROM tasks WHERE parent_id = $1 AND user_id = $2",
      [id, req.user.id]
    );

    const inserted = [];
    for (const sub of subtasks) {
      const r = await pool.query(
        `INSERT INTO tasks (title, notes, parent_id, task_type, user_id)
         VALUES ($1, $2, $3, 'flexible', $4) RETURNING *`,
        [sub.title, sub.notes || null, id, req.user.id]
      );
      inserted.push(r.rows[0]);
    }
    res.json(inserted);
  } catch (err) {
    console.error("Breakdown error:", err.message);
    res.status(500).json({ error: "Failed to break down task." });
  }
});

// POST /api/tasks/:id/subtask
router.post("/:id/subtask", async (req, res) => {
  const { id } = req.params;
  const { title, notes } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });
  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, notes, parent_id, task_type, user_id)
       VALUES ($1, $2, $3, 'flexible', $4) RETURNING *`,
      [title, notes || null, id, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to add subtask." });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE (id = $1 OR parent_id = $1) AND user_id = $2 RETURNING *",
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Task not found." });
    res.json({ message: "Task deleted." });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to delete task." });
  }
});

module.exports = router;

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
const auth = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tasksRouter = require("./routes/tasks");
app.use("/api/tasks", auth, tasksRouter);

const schedulesRouter = require("./routes/schedules");
app.use("/api/schedules", auth, schedulesRouter);

app.post("/api/breakdown", auth, async (req, res) => {
  const { fixedTasks = [], flexibleTasks = [], mood, moodNote, requests, dayStart = "08:00", dayEnd = "22:00" } = req.body;

  if (fixedTasks.length === 0 && flexibleTasks.length === 0) {
    return res.status(400).json({ error: "At least one task is required." });
  }

  const fixedList = fixedTasks.length > 0
    ? fixedTasks.map((t) =>
        `- "${t.title}" from ${t.start_time} to ${t.end_time}${t.notes ? ` (note: ${t.notes})` : ""}`
      ).join("\n")
    : "None";

  const flexibleList = flexibleTasks.length > 0
    ? flexibleTasks.map((t) =>
        `- "${t.title}"${t.notes ? ` (note: ${t.notes})` : ""}`
      ).join("\n")
    : "None";

  const prompt = `
You are an assistant helping someone with ADHD build a realistic time-based schedule for their day.

The user's day runs from ${dayStart} to ${dayEnd}.
Their current mood is: "${mood || "neutral"}"${moodNote ? `\nMore about how they feel: "${moodNote}"` : ""}${requests ? `\nSpecific requests from the user: "${requests}"` : ""}

FIXED tasks (already have set times — do not move these):
${fixedList}

FLEXIBLE tasks (need to be placed in the gaps between fixed tasks):
${flexibleList}

Instructions:
- Keep fixed tasks exactly at their specified times.
- Estimate task durations REALISTICALLY. A quick task like "call mom" = 10-15 min. A focused work session like "write essay section" = 45-90 min. Do not artificially cap everything at 20 minutes.
- If a flexible task is complex, you may split it into 2-3 sessions spread across the day (e.g. "check bugs - morning session" and "check bugs - afternoon session") rather than cramming it all at once.
- FILL THE DAY. Spread tasks across the full ${dayStart}–${dayEnd} window. Do not cluster everything in the morning and leave hours empty. No single gap between tasks should exceed 90 minutes unless it is blocked by a fixed task.
- Fit the energy level to the mood: if tired or low energy, start with easier tasks and save demanding ones for when energy peaks mid-morning; if motivated or focused, front-load demanding work.
- Do not schedule anything outside ${dayStart}–${dayEnd}.

STRICT rules for breaks:
- Never place two breaks next to each other. A break must always be separated from another break by at least one real task.
- Do not add meal breaks (breakfast, lunch, dinner) as separate items. Leave meal time as an unscheduled gap — the user will eat when they want.
- Only add a break if there is a gap of 90+ minutes between tasks. One break per gap maximum. If mood is "tired" or "low energy", the break can be 30–45 min. If mood is "motivated" or "focused", keep it to 15–20 min.
- Never add "relax", "free time", "evening relaxation", "wind down", or leisure blocks. Leave empty time empty.

Return a JSON array of schedule blocks in chronological order. Each block must have:
- "title": the task or step name
- "start_time": "HH:MM" (24h format)
- "end_time": "HH:MM" (24h format)
- "type": "fixed", "flexible", or "break"
- "tip": short ADHD-friendly tip (empty string for fixed tasks and breaks)

Only return valid JSON. No extra text.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });
    const raw = response.choices[0].message.content.trim();
    const json = raw.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    res.json({ schedule: JSON.parse(json) });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to build the schedule. Check your API key." });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

import { useState } from "react";

const MOODS = [
  { value: "focused", label: "Focused" },
  { value: "low energy", label: "Low Energy" },
  { value: "anxious", label: "Anxious" },
  { value: "overwhelmed", label: "Overwhelmed" },
  { value: "motivated", label: "Motivated" },
];

function TaskForm({ onSubmit, loading }) {
  const [mood, setMood] = useState("focused");
  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("22:00");
  const [moodNote, setMoodNote] = useState("");
  const [requests, setRequests] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ mood, dayStart, dayEnd, moodNote, requests });
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="field">
        <label>How are you feeling right now?</label>
        <div className="mood-buttons">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              className={`mood-btn ${mood === m.value ? "active" : ""}`}
              onClick={() => setMood(m.value)}
              disabled={loading}
            >
              {m.label}
            </button>
          ))}
        </div>
        <textarea
          className="mood-note"
          placeholder="Anything else about how you're feeling? (optional) — e.g. 'slept badly', 'stressed about exam'"
          value={moodNote}
          onChange={(e) => setMoodNote(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      <div className="field">
        <label>Your day runs from</label>
        <div className="time-range">
          <input
            type="time"
            value={dayStart}
            onChange={(e) => setDayStart(e.target.value)}
            disabled={loading}
          />
          <span>to</span>
          <input
            type="time"
            value={dayEnd}
            onChange={(e) => setDayEnd(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="field">
        <label>Any specific requests? <span className="optional">(optional)</span></label>
        <textarea
          className="requests-input"
          placeholder="e.g. 'don't put 2 hard tasks back to back', 'give me a long break after gym', 'keep mornings light'"
          value={requests}
          onChange={(e) => setRequests(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      <button type="submit" className="submit-btn" disabled={loading}>
        {loading ? "Building your schedule..." : "Build my schedule"}
      </button>
    </form>
  );
}

export default TaskForm;

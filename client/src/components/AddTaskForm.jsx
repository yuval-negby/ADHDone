import { useState } from "react";

const WEEKDAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

function AddTaskForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [taskType, setTaskType] = useState("flexible");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("");
  // flexible fields
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState("none");
  const [recurrenceDays, setRecurrenceDays] = useState("");
  // fixed fields
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [fixedRecurrence, setFixedRecurrence] = useState("none");
  const [selectedWeekdays, setSelectedWeekdays] = useState([]);

  function toggleWeekday(val) {
    setSelectedWeekdays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;

    const base = { title, notes: notes || null, task_type: taskType };

    if (taskType === "fixed") {
      onAdd({
        ...base,
        start_time: startTime,
        end_time: endTime,
        recurrence: fixedRecurrence,
        due_date: dueDate || null,
        recurrence_weekdays:
          fixedRecurrence === "custom" ? JSON.stringify(selectedWeekdays) : null,
      });
    } else {
      onAdd({
        ...base,
        due_date: dueDate || null,
        recurrence,
        recurrence_days: recurrence === "custom" ? parseInt(recurrenceDays) : null,
        priority: priority || null,
      });
    }

    // reset
    setTitle(""); setNotes(""); setTaskType("flexible");
    setDueDate(""); setRecurrence("none"); setRecurrenceDays("");
    setStartTime(""); setEndTime("");
    setFixedRecurrence("none"); setSelectedWeekdays([]);
    setPriority("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="add-task-btn" onClick={() => setOpen(true)}>
        + Add task
      </button>
    );
  }

  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      {/* Task type toggle */}
      <div className="type-toggle">
        <button
          type="button"
          className={`type-btn ${taskType === "flexible" ? "active" : ""}`}
          onClick={() => setTaskType("flexible")}
        >
          Flexible
        </button>
        <button
          type="button"
          className={`type-btn ${taskType === "fixed" ? "active" : ""}`}
          onClick={() => setTaskType("fixed")}
        >
          Fixed time
        </button>
      </div>

      <input
        type="text"
        placeholder="Task name"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {taskType === "fixed" && (
        <>
          <div className="add-task-row">
            <div className="field-group">
              <label>Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="field-group">
              <label>End time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="add-task-row">
            <div className="field-group">
              <label>Repeats</label>
              <select value={fixedRecurrence} onChange={(e) => setFixedRecurrence(e.target.value)}>
                <option value="none">One time</option>
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
                <option value="custom">Custom days</option>
              </select>
            </div>
          </div>
          {fixedRecurrence === "custom" && (
            <div className="weekday-picker">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`weekday-btn ${selectedWeekdays.includes(d.value) ? "active" : ""}`}
                  onClick={() => toggleWeekday(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
          {fixedRecurrence === "none" && (
            <div className="add-task-row">
              <div className="field-group">
                <label>Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}

      {taskType === "flexible" && (
        <>
          <div className="add-task-row">
            <div className="field-group">
              <label>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label>Repeats</label>
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="none">Never</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Every X days</option>
              </select>
            </div>
            {recurrence === "custom" && (
              <div className="field-group">
                <label>Every</label>
                <input
                  type="number"
                  min="1"
                  placeholder="days"
                  value={recurrenceDays}
                  onChange={(e) => setRecurrenceDays(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="add-task-row">
            <div className="field-group">
              <label>Importance</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">Not set</option>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="add-task-actions">
        <button type="submit" className="submit-btn" disabled={!title.trim()}>
          Save task
        </button>
        <button type="button" className="cancel-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddTaskForm;

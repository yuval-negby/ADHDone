import { useState, useEffect } from "react";

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isScheduledOnDate(task, date) {
  const dayOfWeek = date.getDay();
  const dateStr = toLocalDateStr(date);
  const skipped = JSON.parse(task.skipped_dates || "[]");
  if (skipped.includes(dateStr)) return false;

  switch (task.recurrence) {
    case "none":
      return task.due_date === dateStr;
    case "daily":
      return true;
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case "weekly": {
      const baseStr = task.due_date || task.created_at.split("T")[0];
      const base = new Date(baseStr + "T12:00:00");
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

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function Calendar({ tasks, monthSchedules, onMonthChange, onViewDate, onPlanDate }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [selectedDay, setSelectedDay] = useState(null);

  const fixedTasks = tasks.filter((t) => t.task_type === "fixed" && !t.parent_id);

  useEffect(() => {
    onMonthChange(year, month);
    setSelectedDay(null);
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  function getDateStr(day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function getFixedForDay(day) {
    const date = new Date(year, month - 1, day, 12);
    return fixedTasks.filter((t) => isScheduledOnDate(t, date));
  }

  function getSchedulesForDay(day) {
    const dateStr = getDateStr(day);
    return monthSchedules.filter((s) => s.date === dateStr);
  }

  // Build grid cells
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayStr = toLocalDateStr(today);

  // Selected day info
  const selFixed = selectedDay ? getFixedForDay(selectedDay) : [];
  const selSchedules = selectedDay ? getSchedulesForDay(selectedDay) : [];
  const selDateStr = selectedDay ? getDateStr(selectedDay) : null;
  const selDateLabel = selectedDay
    ? new Date(year, month - 1, selectedDay).toLocaleDateString("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="calendar">
      {/* Month navigation */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-month-label">{MONTH_NAMES[month - 1]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* Day-of-week headers + day cells in one unified grid */}
      <div className="cal-grid">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="cal-grid-header-cell">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="cal-cell empty" />;

          const dateStr = getDateStr(day);
          const fixed = getFixedForDay(day);
          const schedules = getSchedulesForDay(day);
          const isToday = dateStr === todayStr;
          const isSelected = selectedDay === day;

          return (
            <div
              key={day}
              className={`cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => setSelectedDay(isSelected ? null : day)}
            >
              <div className="cal-cell-inner">
                <span className="cal-day-num">{day}</span>
                <div className="cal-dots">
                  {fixed.length > 0 && (
                    <span className="cal-dot fixed" title={`${fixed.length} fixed task${fixed.length > 1 ? "s" : ""}`} />
                  )}
                  {schedules.length > 0 && (
                    <span className="cal-dot cal-schedule" title={`${schedules.length} schedule${schedules.length > 1 ? "s" : ""}`} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <div className="cal-legend-item"><span className="cal-dot fixed" /> Fixed task</div>
        <div className="cal-legend-item"><span className="cal-dot cal-schedule" /> Saved schedule</div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="cal-detail">
          <div className="cal-detail-header">
            <span className="cal-detail-date">{selDateLabel}</span>
            <div className="cal-detail-actions">
              {selSchedules.length > 0 && (
                <button className="action-btn primary" onClick={() => onViewDate(selDateStr)}>
                  View schedule
                </button>
              )}
              <button className="action-btn" onClick={() => onPlanDate(selDateStr)}>
                Plan this day
              </button>
            </div>
          </div>

          {selFixed.length === 0 && selSchedules.length === 0 && (
            <p className="cal-detail-empty">Nothing planned yet.</p>
          )}

          {selFixed.length > 0 && (
            <div className="cal-detail-section">
              <p className="cal-detail-label">Fixed tasks</p>
              <ul className="cal-detail-list">
                {selFixed.map((t) => (
                  <li key={t.id} className="cal-detail-item fixed">
                    <span className="cal-detail-time">
                      {formatTime(t.start_time)}{t.end_time ? ` – ${formatTime(t.end_time)}` : ""}
                    </span>
                    <span className="cal-detail-title">{t.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selSchedules.length > 0 && (
            <div className="cal-detail-section">
              <p className="cal-detail-label">
                Scheduled{selSchedules.length > 1 ? ` (${selSchedules.length} versions)` : ""}
              </p>
              <ul className="cal-detail-list">
                {selSchedules[0].blocks
                  .filter((b) => b.type !== "break")
                  .sort((a, b) => (a.start_time > b.start_time ? 1 : -1))
                  .slice(0, 6)
                  .map((b, i) => (
                    <li key={i} className={`cal-detail-item ${b.type}`}>
                      <span className="cal-detail-time">{formatTime(b.start_time)}</span>
                      <span className={`cal-detail-title${b.done ? " done" : ""}`}>{b.title}</span>
                    </li>
                  ))}
                {selSchedules[0].blocks.filter((b) => b.type !== "break").length > 6 && (
                  <li className="cal-detail-more">
                    +{selSchedules[0].blocks.filter((b) => b.type !== "break").length - 6} more blocks
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Calendar;

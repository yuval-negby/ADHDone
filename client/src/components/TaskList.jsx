import { useState, useRef, useEffect } from "react";
import AddTaskForm from "./AddTaskForm";

// Closes the dropdown when the user clicks anywhere outside it
function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onClose]);
}

function TaskMenu({ task, onEdit, onDone, onDelete, onAiBreakdown, isBreaking }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  function act(fn) {
    setOpen(false);
    fn();
  }

  return (
    <div className="task-menu" ref={ref}>
      <button
        className="task-menu-btn"
        onClick={() => setOpen((v) => !v)}
        title="More options"
      >
        ⋯
      </button>
      {open && (
        <div className="task-menu-dropdown">
          <button onClick={() => act(() => onAiBreakdown(task))} disabled={isBreaking}>
            {isBreaking ? "Breaking down…" : "✦ AI breakdown"}
          </button>
          <button onClick={() => act(() => onEdit(task))}>Edit</button>
          <button onClick={() => act(() => onDone(task.id))}>Mark done</button>
          <button className="danger" onClick={() => act(() => onDelete(task.id))}>Delete</button>
        </div>
      )}
    </div>
  );
}

// Checkbox that supports the indeterminate (−) state
function IndeterminateCheckbox({ checked, indeterminate, onChange, title }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="task-checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
    />
  );
}

function scoreTask(task, subtasks) {
  let score = 0;
  let reasons = [];

  // Urgency: due date proximity
  if (task.due_date) {
    const days = Math.floor(
      (new Date(task.due_date + "T12:00:00") - new Date()) / (1000 * 60 * 60 * 24)
    );
    if (days < 0)       { score += 100; reasons.push("Overdue"); }
    else if (days === 0){ score += 80;  reasons.push("Due today"); }
    else if (days === 1){ score += 65;  reasons.push("Due tomorrow"); }
    else if (days <= 3) { score += 50;  reasons.push(`Due in ${days} days`); }
    else if (days <= 7) { score += 30;  reasons.push(`Due in ${days} days`); }
    else if (days <= 14){ score += 15;  reasons.push(`Due in ${days} days`); }
  }

  // Momentum: almost-done tasks get a boost
  if (subtasks.length > 0) {
    const done = subtasks.filter((s) => s.status === "done").length;
    const ratio = done / subtasks.length;
    if (ratio >= 0.75)      { score += 40; reasons.push("Almost done"); }
    else if (ratio >= 0.5)  { score += 25; reasons.push("More than halfway"); }
    else if (ratio >= 0.25) { score += 10; }
  }

  // Importance: user-set priority
  if (task.priority === "high")        { score += 50; reasons.push("High importance"); }
  else if (task.priority === "medium") { score += 25; reasons.push("Medium importance"); }
  else if (task.priority === "low")    { score += 5; }

  return { score, reason: reasons[0] || null };
}

function formatTime(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function TaskList({ tasks, todayFixed, onAdd, onPlanDay, onUpdate, onDelete, onSkipToday, onAiBreakdown, onEdit }) {
  const [selected, setSelected] = useState([]); // ids of selected subtasks or childless tasks
  const [expanded, setExpanded] = useState({}); // parentId -> bool
  const [breaking, setBreaking] = useState({}); // taskId -> bool (loading state)

  // Only top-level flexible tasks
  const flexibleParents = tasks.filter(
    (t) => t.task_type !== "fixed" && !t.parent_id && (t.status === "pending" || t.status === "snoozed")
  );

  function getSubtasks(parentId) {
    return tasks.filter((t) => t.parent_id === parentId);
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleAllSubtasks(parentId) {
    const pending = getSubtasks(parentId).filter((s) => s.status !== "done");
    const pendingIds = pending.map((s) => s.id);
    const allSelected = pendingIds.every((id) => selected.includes(id));
    if (allSelected) {
      setSelected((prev) => prev.filter((id) => !pendingIds.includes(id)));
    } else {
      setSelected((prev) => [...prev.filter((id) => !pendingIds.includes(id)), ...pendingIds]);
      // Also expand so the user can see what got selected
      setExpanded((prev) => ({ ...prev, [parentId]: true }));
    }
  }

  async function handleAiBreakdown(task) {
    setBreaking((prev) => ({ ...prev, [task.id]: true }));
    setExpanded((prev) => ({ ...prev, [task.id]: true }));
    await onAiBreakdown(task.id);
    setBreaking((prev) => ({ ...prev, [task.id]: false }));
  }

  function handlePlanDay() {
    const flexibleForPlan = tasks.filter((t) => selected.includes(t.id));
    onPlanDay(flexibleForPlan);
    setSelected([]);
  }


  // Score all pending flexible parent tasks and pick top 3
  const suggestions = flexibleParents
    .map((task) => {
      const subs = getSubtasks(task.id);
      const { score, reason } = scoreTask(task, subs);
      return { task, score, reason };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="task-list">
      <AddTaskForm onAdd={onAdd} />

      <button className="plan-day-btn" onClick={handlePlanDay}>
        Plan my day
        {selected.length > 0 ? ` · ${selected.length} task${selected.length > 1 ? "s" : ""}` : ""}
      </button>

      {/* Fixed tasks for today */}
      {todayFixed.length > 0 && (
        <div className="fixed-section">
          <p className="section-label">Fixed that day</p>
          <ul className="task-items">
            {todayFixed.map((task) => (
              <li key={task.id} className="task-item fixed">
                <div className="task-item-main">
                  <div className="task-item-info">
                    <span className="task-item-title">{task.title}</span>
                    <span className="task-time-badge">
                      {formatTime(task.start_time)} – {formatTime(task.end_time)}
                    </span>
                  </div>
                  <div className="task-item-actions">
                    <button className="action-btn" onClick={() => onSkipToday(task.id)}>Skip today</button>
                    <button className="action-btn danger" onClick={() => onDelete(task.id)}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What to do next */}
      {suggestions.length > 0 && (
        <div className="suggestions-section">
          <p className="section-label">What to do next</p>
          <ul className="task-items">
            {suggestions.map(({ task, reason }) => {
              const subs = getSubtasks(task.id);
              const doneSubs = subs.filter((s) => s.status === "done").length;
              return (
                <li key={task.id} className="task-item suggestion-item">
                  <div className="task-item-main">
                    <div className="task-item-info">
                      <div className="suggestion-title-row">
                        {task.priority === "high" && <span className="priority-badge high">🔴</span>}
                        {task.priority === "medium" && <span className="priority-badge medium">🟡</span>}
                        {task.priority === "low" && <span className="priority-badge low">🟢</span>}
                        <span className="task-item-title">{task.title}</span>
                      </div>
                      <div className="task-item-meta">
                        {reason && <span className="suggestion-reason">{reason}</span>}
                        {subs.length > 0 && (
                          <span className="subtask-count">{doneSubs}/{subs.length} done</span>
                        )}
                      </div>
                    </div>
                    <div className="task-item-actions">
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={selected.includes(task.id) || subs.some((s) => selected.includes(s.id))}
                        onChange={() => {
                          if (subs.length > 0) {
                            toggleExpand(task.id);
                            setExpanded((prev) => ({ ...prev, [task.id]: true }));
                          } else {
                            toggleSelect(task.id);
                          }
                        }}
                        title="Add to today's plan"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Flexible tasks */}
      {flexibleParents.length > 0 && (
        <div className="flexible-section">
          <p className="section-label">Tasks — check to include in today's plan</p>
          <ul className="task-items">
            {flexibleParents.map((task) => {
              const subtasks = getSubtasks(task.id);
              const hasSubtasks = subtasks.length > 0;
              const isExpanded = expanded[task.id];
              const isBreaking = breaking[task.id];

              return (
                <li key={task.id} className="task-item parent-task">
                  {/* Parent row */}
                  <div className="task-item-main">
                    {!hasSubtasks ? (
                      <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={selected.includes(task.id)}
                        onChange={() => toggleSelect(task.id)}
                      />
                    ) : (
                      <div className="parent-task-left">
                        <button
                          className={`expand-btn ${isExpanded ? "open" : ""}`}
                          onClick={() => toggleExpand(task.id)}
                          title={isExpanded ? "Collapse" : "Expand subtasks"}
                        >
                          ▶
                        </button>
                        {(() => {
                          const pending = subtasks.filter((s) => s.status !== "done");
                          const selectedCount = pending.filter((s) => selected.includes(s.id)).length;
                          return (
                            <IndeterminateCheckbox
                              checked={pending.length > 0 && selectedCount === pending.length}
                              indeterminate={selectedCount > 0 && selectedCount < pending.length}
                              onChange={() => toggleAllSubtasks(task.id)}
                              title={`Select all remaining subtasks (${pending.length - selectedCount} left)`}
                            />
                          );
                        })()}
                      </div>
                    )}

                    <div className="task-item-info">
                      <span className="task-item-title">{task.title}</span>
                      {task.notes && <span className="task-item-notes">{task.notes}</span>}
                      <div className="task-item-meta">
                        {hasSubtasks && (
                          <span className="subtask-count">
                            {subtasks.filter((s) => s.status === "done").length}/{subtasks.length} done
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`task-due ${isOverdue(task.due_date) ? "overdue" : ""}`}>
                            {isOverdue(task.due_date) ? "Overdue · " : "Due "}
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.recurrence !== "none" && (
                          <span className="task-recurrence">
                            {task.recurrence === "custom" ? `Every ${task.recurrence_days} days` : task.recurrence}
                          </span>
                        )}
                      </div>
                    </div>

                    <TaskMenu
                      task={task}
                      onEdit={onEdit}
                      onDone={(id) => onUpdate(id, { status: "done" })}
                      onDelete={onDelete}
                      onAiBreakdown={handleAiBreakdown}
                      isBreaking={isBreaking}
                    />
                  </div>

                  {/* Subtask list */}
                  {hasSubtasks && isExpanded && (
                    <ul className="subtask-items">
                      {subtasks.map((sub) => (
                        <li key={sub.id} className={`subtask-item ${sub.status === "done" ? "done" : ""}`}>
                          <input
                            type="checkbox"
                            className="task-checkbox"
                            checked={selected.includes(sub.id)}
                            onChange={() => toggleSelect(sub.id)}
                            disabled={sub.status === "done"}
                          />
                          <div className="task-item-info">
                            <span className="task-item-title">{sub.title}</span>
                            {sub.notes && <span className="task-item-notes">{sub.notes}</span>}
                          </div>
                          <div className="task-item-actions">
                            <button className="action-btn" onClick={() => onUpdate(sub.id, { status: sub.status === "done" ? "pending" : "done" })}>
                              {sub.status === "done" ? "Undo" : "Done"}
                            </button>
                            <button className="action-btn danger" onClick={() => onDelete(sub.id)}>Delete</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {todayFixed.length === 0 && flexibleParents.length === 0 && (
        <p className="empty-state">No tasks yet. Add one above.</p>
      )}
    </div>
  );
}

export default TaskList;

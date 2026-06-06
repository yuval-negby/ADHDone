import { useState } from "react";

function EditTaskPanel({ task, subtasks, onClose, onSaveTask, onAddSubtask, onDeleteSubtask }) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || "");
  const [priority, setPriority] = useState(task.priority || "");
  const [newSubtask, setNewSubtask] = useState("");
  const [newSubtaskNotes, setNewSubtaskNotes] = useState("");

  function handleSaveTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    onSaveTask(task.id, { title, notes: notes || null, priority: priority || null });
  }

  function handleAddSubtask(e) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    onAddSubtask(task.id, { title: newSubtask, notes: newSubtaskNotes || null });
    setNewSubtask("");
    setNewSubtaskNotes("");
  }

  return (
    <div className="panel-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <div className="panel-header">
          <h3>Edit task</h3>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>

        {/* Edit title and notes */}
        <form className="panel-form" onSubmit={handleSaveTask}>
          <div className="field-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="field-group">
            <label>Importance</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Not set</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <button type="submit" className="submit-btn" disabled={!title.trim()}>
            Save changes
          </button>
        </form>

        {/* Subtasks */}
        <div className="panel-subtasks">
          <p className="panel-section-label">Subtasks ({subtasks.length})</p>

          {subtasks.length === 0 && (
            <p className="empty-state" style={{ marginTop: 8 }}>
              No subtasks yet. Add one below or use AI breakdown.
            </p>
          )}

          <ul className="panel-subtask-list">
            {subtasks.map((sub) => (
              <li key={sub.id} className={`panel-subtask ${sub.status === "done" ? "done" : ""}`}>
                <span className="panel-subtask-title">{sub.title}</span>
                {sub.notes && <span className="panel-subtask-notes">{sub.notes}</span>}
                <button
                  className="action-btn danger"
                  onClick={() => onDeleteSubtask(sub.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          {/* Add subtask manually */}
          <form className="panel-add-subtask" onSubmit={handleAddSubtask}>
            <input
              type="text"
              placeholder="New subtask title"
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={newSubtaskNotes}
              onChange={(e) => setNewSubtaskNotes(e.target.value)}
            />
            <button type="submit" className="action-btn primary" disabled={!newSubtask.trim()}>
              Add subtask
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditTaskPanel;

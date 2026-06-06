import { useState } from "react";

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

function Schedule({ schedule, onBlocksChange, onAiAdjust, adjusting, planDate }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [adjustInstruction, setAdjustInstruction] = useState("");
  const [showAddAt, setShowAddAt] = useState(null); // index to insert after
  const [newBlock, setNewBlock] = useState({ title: "", start_time: "", end_time: "", type: "flexible" });

  const canEdit = !!onBlocksChange;

  // Sort blocks by start_time before rendering so AI order errors don't show
  const sorted = [...schedule].sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

  // ── Done toggle ──
  function toggleDone(i) {
    const updated = sorted.map((b, idx) =>
      idx === i ? { ...b, done: !b.done } : b
    );
    onBlocksChange(updated);
  }

  // ── Delete block ──
  function deleteBlock(i) {
    onBlocksChange(sorted.filter((_, idx) => idx !== i));
  }

  // ── Start inline edit ──
  function startEdit(i) {
    setEditingIndex(i);
    setEditDraft({ ...sorted[i] });
  }

  function saveEdit() {
    const updated = sorted.map((b, idx) =>
      idx === editingIndex ? { ...b, ...editDraft } : b
    );
    onBlocksChange(updated);
    setEditingIndex(null);
  }

  // ── Add block ──
  function confirmAdd(afterIndex) {
    const block = { ...newBlock, tip: "", done: false };
    const updated = [
      ...sorted.slice(0, afterIndex + 1),
      block,
      ...sorted.slice(afterIndex + 1),
    ];
    onBlocksChange(updated);
    setShowAddAt(null);
    setNewBlock({ title: "", start_time: "", end_time: "", type: "flexible" });
  }

  // ── AI adjust submit ──
  function handleAdjust(e) {
    e.preventDefault();
    if (!adjustInstruction.trim()) return;
    onAiAdjust(adjustInstruction);
    setAdjustInstruction("");
  }

  return (
    <div className="schedule">
      <h2>
        {planDate
          ? `Plan for ${new Date(planDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`
          : "Your plan"}
      </h2>
      <p className="schedule-total">{schedule.length} blocks</p>

      <div className="timeline">
        {sorted.map((block, i) => (
          <div key={i}>
            {/* Block */}
            <div className={`timeline-block ${block.type} ${block.done ? "done" : ""}`}>
              <div className="timeline-time">
                <span>{formatTime(block.start_time)}</span>
                <span className="timeline-end">{formatTime(block.end_time)}</span>
              </div>
              <div className="timeline-bar" />

              {editingIndex === i ? (
                // ── Inline edit mode ──
                <div className="timeline-edit">
                  <input
                    value={editDraft.title}
                    onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                    placeholder="Title"
                  />
                  <div className="timeline-edit-times">
                    <input
                      type="time"
                      value={editDraft.start_time}
                      onChange={(e) => setEditDraft({ ...editDraft, start_time: e.target.value })}
                    />
                    <span>→</span>
                    <input
                      type="time"
                      value={editDraft.end_time}
                      onChange={(e) => setEditDraft({ ...editDraft, end_time: e.target.value })}
                    />
                  </div>
                  <select
                    value={editDraft.type}
                    onChange={(e) => setEditDraft({ ...editDraft, type: e.target.value })}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="flexible">Flexible</option>
                    <option value="break">Break</option>
                  </select>
                  <div className="timeline-edit-actions">
                    <button className="action-btn primary" onClick={saveEdit}>Save</button>
                    <button className="action-btn" onClick={() => setEditingIndex(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                // ── View mode ──
                <div className="timeline-content">
                  <div className="timeline-content-row">
                    <span className="timeline-title">{block.title}</span>
                    {canEdit && (
                      <div className="timeline-block-actions">
                        <button
                          className={`done-toggle ${block.done ? "is-done" : ""}`}
                          onClick={() => toggleDone(i)}
                          title={block.done ? "Mark undone" : "Mark done"}
                        >
                          {block.done ? "✓" : "○"}
                        </button>
                        <button className="block-action-btn" onClick={() => startEdit(i)} title="Edit">✏</button>
                        <button className="block-action-btn danger" onClick={() => deleteBlock(i)} title="Delete">✕</button>
                      </div>
                    )}
                  </div>
                  {block.tip && <span className="timeline-tip">{block.tip}</span>}
                </div>
              )}
            </div>

            {/* Add block button between items */}
            {canEdit && (
              <div className="add-block-row">
                {showAddAt === i ? (
                  <div className="add-block-form">
                    <input
                      placeholder="Task title"
                      value={newBlock.title}
                      onChange={(e) => setNewBlock({ ...newBlock, title: e.target.value })}
                      autoFocus
                    />
                    <div className="timeline-edit-times">
                      <input
                        type="time"
                        value={newBlock.start_time}
                        onChange={(e) => setNewBlock({ ...newBlock, start_time: e.target.value })}
                      />
                      <span>→</span>
                      <input
                        type="time"
                        value={newBlock.end_time}
                        onChange={(e) => setNewBlock({ ...newBlock, end_time: e.target.value })}
                      />
                    </div>
                    <select
                      value={newBlock.type}
                      onChange={(e) => setNewBlock({ ...newBlock, type: e.target.value })}
                    >
                      <option value="flexible">Flexible</option>
                      <option value="fixed">Fixed</option>
                      <option value="break">Break</option>
                    </select>
                    <div className="timeline-edit-actions">
                      <button
                        className="action-btn primary"
                        onClick={() => confirmAdd(i)}
                        disabled={!newBlock.title.trim()}
                      >
                        Add
                      </button>
                      <button className="action-btn" onClick={() => setShowAddAt(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="add-block-btn" onClick={() => setShowAddAt(i)}>+</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI adjustment */}
      {onAiAdjust && (
        <form className="adjust-form" onSubmit={handleAdjust}>
          <p className="adjust-label">Ask AI to adjust this schedule</p>
          <div className="adjust-row">
            <input
              type="text"
              placeholder="e.g. 'add more time to the gym', 'longer break after lunch', 'include drive time for the dentist'"
              value={adjustInstruction}
              onChange={(e) => setAdjustInstruction(e.target.value)}
              disabled={adjusting}
            />
            <button type="submit" className="action-btn primary" disabled={adjusting || !adjustInstruction.trim()}>
              {adjusting ? "Adjusting..." : "Adjust"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default Schedule;

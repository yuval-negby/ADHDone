import Schedule from "./Schedule";

function SavedSchedules({ schedules, onDelete, onBlocksChange, onAiAdjust, adjusting }) {
  function formatTime(createdAt) {
    return new Date(createdAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (schedules.length === 0) {
    return (
      <div className="saved-schedules">
        <p className="empty-state">No saved schedules for today yet.</p>
      </div>
    );
  }

  return (
    <div className="saved-schedules">
      {schedules.map((s, i) => (
        <div key={s.id} className="saved-schedule-card">
          <div className="saved-schedule-header">
            <div>
              <span className="saved-schedule-label">
                Schedule {schedules.length > 1 ? `#${schedules.length - i}` : ""}
              </span>
              <span className="saved-schedule-meta">
                Saved at {formatTime(s.created_at)}
                {s.mood && ` · ${s.mood}`}
              </span>
            </div>
            <button
              className="action-btn danger"
              onClick={() => onDelete(s.id)}
            >
              Delete
            </button>
          </div>
          <Schedule
            schedule={s.blocks}
            planDate={s.date}
            onBlocksChange={(blocks) => onBlocksChange(s.id, blocks)}
            onAiAdjust={(instruction) => onAiAdjust(s.id, instruction, s.blocks)}
            adjusting={adjusting}
          />
        </div>
      ))}
    </div>
  );
}

export default SavedSchedules;

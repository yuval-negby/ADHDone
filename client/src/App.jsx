import { useState, useEffect } from "react";
import axios from "axios";
import { supabase } from "./lib/supabase";
import TaskList from "./components/TaskList";
import TaskForm from "./components/TaskForm";
import Schedule from "./components/Schedule";
import SavedSchedules from "./components/SavedSchedules";
import EditTaskPanel from "./components/EditTaskPanel";
import Calendar from "./components/Calendar";
import NavBar from "./components/NavBar";
import AuthPage from "./components/AuthPage";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [todayFixed, setTodayFixed] = useState([]);
  const [planFixed, setPlanFixed] = useState([]);
  const [planFlexible, setPlanFlexible] = useState([]);
  const [planDate, setPlanDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [currentMood, setCurrentMood] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [savedSchedules, setSavedSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [monthSchedules, setMonthSchedules] = useState([]);

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Attach Bearer token to every axios request
  useEffect(() => {
    if (!session) return;
    const interceptor = axios.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${session.access_token}`;
      return config;
    });
    return () => axios.interceptors.request.eject(interceptor);
  }, [session]);

  // Load initial data once logged in
  useEffect(() => {
    if (!session) return;
    axios.get(`${API}/tasks`).then((res) => setTasks(res.data));
    axios.get(`${API}/tasks/today`).then((res) => setTodayFixed(res.data));
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split("T")[0];
    axios.get(`${API}/tasks/for-date?date=${tomorrow}`).then((res) => setPlanFixed(res.data));
    axios.get(`${API}/schedules/for-date?date=${tomorrow}`).then((res) => setSavedSchedules(res.data));
  }, [session]);

  async function addTask(taskData) {
    const res = await axios.post(`${API}/tasks`, taskData);
    setTasks((prev) => [...prev, res.data]);
    if (taskData.task_type === "fixed") {
      axios.get(`${API}/tasks/today`).then((res) => setTodayFixed(res.data));
      fetchFixedForDate(planDate);
    }
  }

  async function updateTask(id, changes) {
    const res = await axios.patch(`${API}/tasks/${id}`, changes);
    const updated = res.data;
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

    if (changes.status === "done" && updated.parent_id) {
      const siblings = tasks.filter(
        (t) => t.parent_id === updated.parent_id && t.id !== id
      );
      const allDone = siblings.every((s) => s.status === "done");
      if (allDone) {
        const parentRes = await axios.patch(`${API}/tasks/${updated.parent_id}`, { status: "done" });
        setTasks((prev) => prev.map((t) => (t.id === updated.parent_id ? parentRes.data : t)));
      }
    }
  }

  async function deleteTask(id) {
    await axios.delete(`${API}/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id && t.parent_id !== id));
    setTodayFixed((prev) => prev.filter((t) => t.id !== id));
  }

  async function skipToday(id) {
    const res = await axios.post(`${API}/tasks/${id}/skip`);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    setTodayFixed((prev) => prev.filter((t) => t.id !== id));
  }

  async function aiBreakdown(taskId) {
    const res = await axios.post(`${API}/tasks/${taskId}/breakdown`);
    setTasks((prev) => [
      ...prev.filter((t) => t.parent_id !== taskId),
      ...res.data,
    ]);
  }

  async function saveTaskEdits(id, changes) {
    const res = await axios.patch(`${API}/tasks/${id}`, changes);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    setEditingTask((prev) => (prev?.id === id ? res.data : prev));
  }

  async function addSubtask(parentId, subtaskData) {
    const res = await axios.post(`${API}/tasks/${parentId}/subtask`, subtaskData);
    setTasks((prev) => [...prev, res.data]);
  }

  async function deleteSubtask(id) {
    await axios.delete(`${API}/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function fetchFixedForDate(date) {
    const res = await axios.get(`${API}/tasks/for-date?date=${date}`);
    setPlanFixed(res.data);
  }

  async function fetchSchedulesForDate(date) {
    const res = await axios.get(`${API}/schedules/for-date?date=${date}`);
    setSavedSchedules(res.data);
  }

  async function handlePlanDateChange(date) {
    setPlanDate(date);
    await Promise.all([fetchFixedForDate(date), fetchSchedulesForDate(date)]);
  }

  function handlePlanDay(flexibleTasks) {
    setPlanFlexible(flexibleTasks);
    setSchedule([]);
    setError("");
    setActiveTab("schedule");
  }

  async function handleSubmit({ mood, dayStart, dayEnd, moodNote, requests }) {
    setCurrentMood(mood);
    setLoading(true);
    setError("");
    setSchedule([]);
    try {
      const res = await axios.post(`${API}/breakdown`, {
        fixedTasks: planFixed.map((t) => ({
          title: t.title, notes: t.notes,
          start_time: t.start_time, end_time: t.end_time,
        })),
        flexibleTasks: planFlexible.map((t) => ({ title: t.title, notes: t.notes })),
        mood, moodNote, requests, dayStart, dayEnd,
      });
      setSchedule(res.data.schedule);
    } catch {
      setError("Something went wrong. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function saveSchedule() {
    setSaving(true);
    try {
      const res = await axios.post(`${API}/schedules`, {
        date: planDate, mood: currentMood, blocks: schedule,
      });
      setSavedSchedules((prev) => [res.data, ...prev]);
      setSchedule([]);
      setPlanFlexible([]);
    } finally {
      setSaving(false);
    }
  }

  async function handleViewDate(date) {
    setPlanDate(date);
    await fetchSchedulesForDate(date);
    setActiveTab("schedule");
  }

  async function deleteSchedule(id) {
    await axios.delete(`${API}/schedules/${id}`);
    setSavedSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function handleUnsavedBlocksChange(updatedBlocks) {
    setSchedule(updatedBlocks);
  }

  async function handleSavedBlocksChange(scheduleId, updatedBlocks) {
    await axios.patch(`${API}/schedules/${scheduleId}`, { blocks: updatedBlocks });
    setSavedSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, blocks: updatedBlocks } : s))
    );
  }

  async function fetchMonthSchedules(year, month) {
    const res = await axios.get(`${API}/schedules/month?year=${year}&month=${month}`);
    setMonthSchedules(res.data);
  }

  async function handleAiAdjust(scheduleId, instruction, currentBlocks) {
    setAdjusting(true);
    try {
      const res = await axios.post(`${API}/schedules/${scheduleId}/adjust`, {
        instruction, blocks: currentBlocks,
      });
      setSavedSchedules((prev) =>
        prev.map((s) => (s.id === scheduleId ? { ...s, blocks: res.data.blocks } : s))
      );
    } catch {
      alert("Failed to adjust schedule. Try again.");
    } finally {
      setAdjusting(false);
    }
  }

  async function handleUnsavedAiAdjust(instruction) {
    setAdjusting(true);
    try {
      const res = await axios.post(`${API}/schedules/adjust`, {
        instruction, blocks: schedule,
      });
      setSchedule(res.data.blocks);
    } catch {
      alert("Failed to adjust schedule. Try again.");
    } finally {
      setAdjusting(false);
    }
  }

  async function handleCalendarPlanDate(date) {
    setPlanDate(date);
    await Promise.all([fetchFixedForDate(date), fetchSchedulesForDate(date)]);
    setActiveTab("tasks");
  }

  const editingSubtasks = editingTask
    ? tasks.filter((t) => t.parent_id === editingTask.id)
    : [];

  const doneTasks = tasks.filter((t) => t.status === "done" && !t.parent_id);
  const inPlanningMode = planFlexible.length > 0 || schedule.length > 0;

  // Still determining auth state
  if (session === undefined) {
    return <div className="auth-loading">Loading…</div>;
  }

  // Not logged in
  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>ADHDone</h1>
        <button className="signout-btn" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      {activeTab === "tasks" && (
        <>
          <div className="planner-date-row">
            <label className="planner-date-label">Planning for</label>
            <input
              type="date"
              className="planner-date-input"
              value={planDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => handlePlanDateChange(e.target.value)}
            />
            {planFixed.length > 0 && (
              <span className="planner-fixed-hint">
                {planFixed.length} fixed task{planFixed.length > 1 ? "s" : ""} that day
              </span>
            )}
          </div>
          <TaskList
            tasks={tasks}
            todayFixed={planFixed}
            onAdd={addTask}
            onPlanDay={handlePlanDay}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onSkipToday={skipToday}
            onAiBreakdown={aiBreakdown}
            onEdit={setEditingTask}
          />
        </>
      )}

      {activeTab === "done" && (
        <div className="done-section">
          {doneTasks.length === 0 ? (
            <p className="empty-state">No completed tasks yet.</p>
          ) : (
            <ul className="task-items">
              {doneTasks.map((task) => (
                <li key={task.id} className="task-item done">
                  <div className="task-item-main">
                    <span className="task-item-title">{task.title}</span>
                    <div className="task-item-actions">
                      <button className="action-btn" onClick={() => updateTask(task.id, { status: "pending" })}>Undo</button>
                      <button className="action-btn danger" onClick={() => deleteTask(task.id)}>Delete</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === "schedule" && (
        <>
          <div className="planner-date-row">
            {inPlanningMode ? (
              <label className="planner-date-label">
                Planning for {new Date(planDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
              </label>
            ) : (
              <>
                <label className="planner-date-label">Schedule for</label>
                <input
                  type="date"
                  className="planner-date-input"
                  value={planDate}
                  onChange={(e) => handlePlanDateChange(e.target.value)}
                />
              </>
            )}
            {planFixed.length > 0 && (
              <span className="planner-fixed-hint">
                {planFixed.length} fixed task{planFixed.length > 1 ? "s" : ""} that day
              </span>
            )}
          </div>

          {planFlexible.length > 0 && schedule.length === 0 && (
            <>
              <TaskForm onSubmit={handleSubmit} loading={loading} />
              {error && <p className="error">{error}</p>}
            </>
          )}

          {schedule.length > 0 && (
            <>
              <div className="schedule-actions">
                <button className="save-schedule-btn" onClick={saveSchedule} disabled={saving}>
                  {saving ? "Saving..." : "Save this schedule"}
                </button>
                <button className="action-btn" onClick={() => setSchedule([])}>Discard</button>
              </div>
              <Schedule
                schedule={schedule}
                planDate={planDate}
                onBlocksChange={handleUnsavedBlocksChange}
                onAiAdjust={handleUnsavedAiAdjust}
                adjusting={adjusting}
              />
            </>
          )}

          {!inPlanningMode && (
            <div className="saved-header-actions">
              <button className="plan-day-btn" onClick={() => setActiveTab("tasks")}>
                + Build a new schedule
              </button>
            </div>
          )}

          {savedSchedules.length > 0 && schedule.length === 0 && (
            <SavedSchedules
              schedules={savedSchedules}
              onDelete={deleteSchedule}
              onBlocksChange={handleSavedBlocksChange}
              onAiAdjust={handleAiAdjust}
              adjusting={adjusting}
            />
          )}

          {!inPlanningMode && savedSchedules.length === 0 && (
            <p className="empty-state">No schedule for this date yet.</p>
          )}
        </>
      )}

      {activeTab === "calendar" && (
        <Calendar
          tasks={tasks}
          monthSchedules={monthSchedules}
          onMonthChange={fetchMonthSchedules}
          onViewDate={handleViewDate}
          onPlanDate={handleCalendarPlanDate}
        />
      )}

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {editingTask && (
        <EditTaskPanel
          task={editingTask}
          subtasks={editingSubtasks}
          onClose={() => setEditingTask(null)}
          onSaveTask={saveTaskEdits}
          onAddSubtask={addSubtask}
          onDeleteSubtask={deleteSubtask}
        />
      )}
    </div>
  );
}

export default App;

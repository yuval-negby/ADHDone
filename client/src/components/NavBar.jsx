function NavBar({ activeTab, onTabChange }) {
  const tabs = [
    { id: "tasks", label: "Tasks" },
    { id: "schedule", label: "Schedule" },
    { id: "done", label: "Done" },
    { id: "calendar", label: "Calendar" },
  ];

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default NavBar;

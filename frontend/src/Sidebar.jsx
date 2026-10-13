function Sidebar({ setPage, currentPage }) {
  return (
    <aside className="sidebar">

      <div className="logo">
        Learnora
      </div>

      <nav>

        <button
          className={currentPage === "dashboard" ? "active" : ""}
          onClick={() => setPage("dashboard")}
        >
          🏠 Dashboard
        </button>

        <button
          className={currentPage === "materials" ? "active" : ""}
          onClick={() => setPage("materials")}
        >
          📚 Materials
        </button>

        <button
          className={currentPage === "tutor" ? "active" : ""}
          onClick={() => setPage("tutor")}
        >
          🤖 AI Tutor
        </button>

        <button
          className={currentPage === "assessment" ? "active" : ""}
          onClick={() => setPage("assessment")}
        >
          📝 Assessment
        </button>

        <button
          className={currentPage === "progress" ? "active" : ""}
          onClick={() => setPage("progress")}
        >
          📊 Progress
        </button>

      </nav>

    </aside>
  );
}

export default Sidebar;
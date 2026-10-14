
import { useState } from "react";
import "./index.css";
import "./polish.css";

import Sidebar from "./Sidebar";
import Dashboard from "./Dashboard";
import Materials from "./Materials";
import Tutor from "./Tutor";
import Assessment from "./Assessment";
import Progress from "./Progress";

function App() {
  const [page, setPage] = useState("dashboard");

  return (
    <div className="app">
      <Sidebar
        setPage={setPage}
        currentPage={page}
      />

      <main className="main-content">
        {page === "dashboard" && <Dashboard />}
        {page === "materials" && <Materials />}
        {page === "tutor" && <Tutor />}
        {page === "assessment" && <Assessment />}
        {page === "progress" && <Progress />}

      </main>
    </div>
  );
}

export default App;
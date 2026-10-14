
import { useEffect, useState } from "react";

const MATERIALS_API = "http://localhost:5000/api/materials";

function Dashboard() {
  const [materials, setMaterials] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMaterials() {
      try {
        const response = await fetch(`${MATERIALS_API}/history`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load PDF history.");
        }

        if (isMounted) {
          setMaterials(Array.isArray(data.materials) ? data.materials : []);
          setError("");
        }
      } catch (err) {
        console.error("Dashboard materials error:", err);

        if (isMounted) {
          setError("PDF history could not be loaded. Check the backend.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    function loadQuizAttempts() {
      try {
        const savedAttempts = JSON.parse(
          localStorage.getItem("learnoraQuizAttempts") || "[]"
        );

        if (isMounted) {
          setQuizAttempts(
            Array.isArray(savedAttempts) ? savedAttempts : []
          );
        }
      } catch (err) {
        console.error("Quiz history error:", err);

        if (isMounted) {
          setQuizAttempts([]);
        }
      }
    }

    loadMaterials();
    loadQuizAttempts();

    // Assessment nundi quiz update event vachinappudu refresh avuthundi.
    window.addEventListener("learnoraQuizUpdated", loadQuizAttempts);

    // Vere tab lo localStorage update ayina refresh avuthundi.
    window.addEventListener("storage", loadQuizAttempts);

    return () => {
      isMounted = false;
      window.removeEventListener("learnoraQuizUpdated", loadQuizAttempts);
      window.removeEventListener("storage", loadQuizAttempts);
    };
  }, []);

  const totalQuizzes = quizAttempts.length;

  const getPercentage = (attempt) => {
    if (attempt.percentage !== undefined && attempt.percentage !== null) {
      const value = Number(attempt.percentage);
      return Number.isFinite(value) ? value : 0;
    }

    const score = Number(attempt.score);
    const total = Number(attempt.total);

    return total > 0 && Number.isFinite(score)
      ? Math.round((score / total) * 100)
      : 0;
  };

  const averageScore = totalQuizzes
    ? Math.round(
        quizAttempts.reduce(
          (sum, attempt) => sum + getPercentage(attempt),
          0
        ) / totalQuizzes
      )
    : 0;

  const recentMaterials = [...materials]
    .sort(
      (a, b) =>
        new Date(b.uploadedAt || 0).getTime() -
        new Date(a.uploadedAt || 0).getTime()
    )
    .slice(0, 5);

  const recentQuizzes = [...quizAttempts]
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    )
    .slice(0, 5);

  const totalPages = materials.reduce(
    (sum, material) => sum + (Number(material.pages) || 0),
    0
  );

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString();
  };

  const cardStyle = {
    background: "var(--card-bg, #ffffff)",
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: "12px",
    padding: "20px",
    minWidth: 0,
    overflowWrap: "anywhere"
  };

  const mutedStyle = {
    color: "var(--muted-color, #6b7280)"
  };

  return (
    <div className="dashboard">
      <div className="topbar">
        <div>
          <h1>Welcome back 👋</h1>
          <p>Continue your learning journey.</p>
        </div>

        <div className="profile">Student</div>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {/* Dashboard summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          margin: "24px 0"
        }}
      >
        <div style={cardStyle}>
          <p style={mutedStyle}>PDFs Uploaded</p>
          <h2>{loading ? "..." : materials.length}</h2>
        </div>

        <div style={cardStyle}>
          <p style={mutedStyle}>Quizzes Completed</p>
          <h2>{totalQuizzes}</h2>
        </div>

        <div style={cardStyle}>
          <p style={mutedStyle}>Average Quiz Score</p>
          <h2>{totalQuizzes ? `${averageScore}%` : "—"}</h2>
        </div>

        <div style={cardStyle}>
          <p style={mutedStyle}>Study Material Pages</p>
          <h2>{loading ? "..." : totalPages}</h2>
        </div>
      </div>

      {/* Recent uploaded materials */}
      <section style={{ marginBottom: "28px" }}>
        <h2 className="section-title">Recent Study Materials</h2>

        {loading ? (
          <p>Loading materials...</p>
        ) : recentMaterials.length === 0 ? (
          <div style={cardStyle}>
            <p>No uploaded PDFs yet.</p>
            <p style={mutedStyle}>
              Upload a PDF in Study Materials to see it here.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {recentMaterials.map((material) => (
              <div
                key={material.id || material.filename}
                style={cardStyle}
              >
                <h3>{material.originalName || material.filename}</h3>

                <p style={mutedStyle}>
                  Uploaded: {formatDate(material.uploadedAt)}
                </p>

                <p>
                  Pages: {material.pages ?? "—"} | Chunks stored:{" "}
                  {material.chunksStored ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent quiz activity */}
      <section style={{ marginBottom: "28px" }}>
        <h2 className="section-title">Recent Quiz Activity</h2>

        {recentQuizzes.length === 0 ? (
          <div style={cardStyle}>
            <p>No quiz attempts recorded yet.</p>
            <p style={mutedStyle}>
              Complete a quiz in Adaptive Assessment to see your results.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {recentQuizzes.map((attempt, index) => (
              <div
                key={attempt.id || `${attempt.date}-${index}`}
                style={cardStyle}
              >
                <h3>
                  {attempt.source ||
                    attempt.sourceName ||
                    "Study material quiz"}
                </h3>

                <p>
                  Score: {attempt.score ?? 0}/{attempt.total ?? 0} (
                  {getPercentage(attempt)}%)
                </p>

                <p>
                  Difficulty: {attempt.difficulty || "—"}
                </p>

                <p style={mutedStyle}>
                  {formatDate(attempt.date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Learning progress */}
      <section>
        <h2 className="section-title">Learning Progress</h2>

        <div style={cardStyle}>
          <p>
            You have completed <strong>{totalQuizzes}</strong> quiz
            attempt{totalQuizzes === 1 ? "" : "s"}.
          </p>

          {totalQuizzes > 0 ? (
            <p>
              Your average score across recorded attempts is{" "}
              <strong>{averageScore}%</strong>.
            </p>
          ) : (
            <p style={mutedStyle}>
              Complete your first quiz to start tracking your performance.
            </p>
          )}

          <p style={mutedStyle}>
            Topic mastery will be added when topic-level performance data
            is available.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;

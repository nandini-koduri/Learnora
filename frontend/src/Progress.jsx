import { useState } from "react";
import "./index.css";

function Progress() {
  const [attempts] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("learnoraQuizAttempts") || "[]"
      );
    } catch {
      return [];
    }
  });

  const totalQuizzes = attempts.length;

  const averagePercentage = totalQuizzes
    ? Math.round(
        attempts.reduce(
          (sum, item) =>
            sum + (item.total ? (item.score / item.total) * 100 : 0),
          0
        ) / totalQuizzes
      )
    : 0;

  const bestPercentage = totalQuizzes
    ? Math.max(
        ...attempts.map((item) =>
          item.total ? Math.round((item.score / item.total) * 100) : 0
        )
      )
    : 0;

  const latestAttempt = attempts[0];

  return (
    <div className="progress-page">
      <h1>Learning Progress</h1>
      <p>Track your quiz performance and learning journey.</p>

      <div className="progress-grid">
        <div className="progress-card">
          <span>Total Quizzes</span>
          <h2>{totalQuizzes}</h2>
        </div>

        <div className="progress-card">
          <span>Average Score</span>
          <h2>{averagePercentage}%</h2>
        </div>

        <div className="progress-card">
          <span>Best Score</span>
          <h2>{bestPercentage}%</h2>
        </div>
      </div>

      <section className="progress-history">
        <h2>Quiz History</h2>

        {totalQuizzes === 0 ? (
          <p className="progress-empty">
            No quiz attempts yet. Complete a quiz in Assessment to see
            your progress here.
          </p>
        ) : (
          <div className="progress-list">
            {attempts.map((item, index) => {
              const percentage = item.total
                ? Math.round((item.score / item.total) * 100)
                : 0;

              return (
                <div className="progress-item" key={item.id || index}>
                  <div>
                    <strong>
                      {item.difficulty
                        ? item.difficulty.charAt(0).toUpperCase() +
                          item.difficulty.slice(1)
                        : "Quiz"}{" "}
                      Quiz
                    </strong>

                    <p>
                      {item.date
                        ? new Date(item.date).toLocaleString()
                        : "Date unavailable"}
                    </p>

                    <span>
                      Score: {item.score}/{item.total}
                    </span>
                  </div>

                  <strong className="progress-percentage">
                    {percentage}%
                  </strong>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Progress;


import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const AI_API = "http://127.0.0.1:8000";
const MATERIALS_API = "http://localhost:5000/api/materials";

function Assessment() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [difficulty, setDifficulty] = useState("easy");
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [materials, setMaterials] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    async function loadMaterials() {
      try {
        const response = await fetch(`${MATERIALS_API}/history`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load PDFs.");
        }

        setMaterials(
          Array.isArray(data.materials) ? data.materials : []
        );
      } catch (err) {
        console.error("PDF history error:", err);
        setError("Could not load PDF history. Check the backend.");
      } finally {
        setHistoryLoading(false);
      }
    }

    loadMaterials();
  }, []);

  async function generateQuiz() {
    setLoading(true);
    setError("");
    setScore(null);
    setQuestions([]);
    setAnswers({});

    try {
      const requestBody = {
        difficulty,
        question_count: 5
      };

      if (selectedSource) {
        requestBody.source_name = selectedSource;
      }

      const response = await fetch(`${AI_API}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Quiz generation failed.");
      }

      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("No quiz questions were returned.");
      }

      setQuestions(data.questions);
    } catch (err) {
      console.error("Quiz error:", err);
      setError(err.message || "Could not generate quiz.");
    } finally {
      setLoading(false);
    }
  }

  function submitQuiz() {
    if (questions.length === 0) {
      setError("Generate a quiz before submitting.");
      return;
    }

    if (Object.keys(answers).length !== questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }

    let correct = 0;

    questions.forEach((question, index) => {
      if (Number(answers[index]) === Number(question.answer)) {
        correct++;
      }
    });

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    const attempt = {
      id: Date.now(),
      score: correct,
      total,
      percentage,
      difficulty,
      source: selectedSource || "All uploaded materials",
      date: new Date().toISOString()
    };

    // Save quiz history in this browser.
    let updatedAttempts = [];

    try {
      const savedAttempts = JSON.parse(
        localStorage.getItem("learnoraQuizAttempts") || "[]"
      );

      const previousAttempts = Array.isArray(savedAttempts)
        ? savedAttempts
        : [];

      updatedAttempts = [attempt, ...previousAttempts];

      localStorage.setItem(
        "learnoraQuizAttempts",
        JSON.stringify(updatedAttempts)
      );
    } catch (err) {
      console.error("Could not save quiz history:", err);
      setError(
        "Quiz completed, but its history could not be saved in this browser."
      );
    }

    // Tell the Dashboard to refresh its quiz statistics.
    window.dispatchEvent(new Event("learnoraQuizUpdated"));

    // Adjust difficulty for the next quiz.
    let nextDifficulty = difficulty;

    if (percentage >= 80) {
      if (difficulty === "easy") {
        nextDifficulty = "medium";
      } else if (difficulty === "medium") {
        nextDifficulty = "hard";
      }
    } else if (percentage < 50) {
      if (difficulty === "hard") {
        nextDifficulty = "medium";
      } else if (difficulty === "medium") {
        nextDifficulty = "easy";
      }
    }

    setScore(correct);
    setDifficulty(nextDifficulty);
  }

  function startNextQuiz() {
    generateQuiz();
  }

  return (
    <div className="assessment-page">
      <h1>Adaptive Assessment</h1>

      <p>
        Test your understanding using your uploaded study materials.
        Your performance helps choose the next quiz difficulty.
      </p>

      <div className="assessment-controls">
        <label htmlFor="study-pdf">
          <strong>Choose study material:</strong>
        </label>

        <select
          id="study-pdf"
          value={selectedSource}
          onChange={(event) => setSelectedSource(event.target.value)}
          disabled={loading || score !== null}
        >
          <option value="">All uploaded materials</option>

          {materials.map((material) => (
            <option
              key={material.id || material.filename}
              value={material.originalName}
            >
              {material.originalName || material.filename}
            </option>
          ))}
        </select>

        {historyLoading && <p>Loading PDFs...</p>}

        {!historyLoading && materials.length === 0 && (
          <p>Upload a PDF in Study Materials to begin.</p>
        )}

        <label htmlFor="difficulty">
          <strong>Quiz difficulty:</strong>
        </label>

        <select
          id="difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          disabled={loading || score !== null}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <button
        onClick={generateQuiz}
        disabled={loading || historyLoading}
      >
        {loading ? "Generating quiz..." : "Generate Quiz"}
      </button>

      {error && <p role="alert">{error}</p>}

      {questions.length > 0 && score === null && (
        <p>
          <strong>Current quiz difficulty:</strong>{" "}
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </p>
      )}

      {questions.map((question, index) => (
        <div className="message assistant" key={index}>
          <h3>
            {index + 1}. {question.question}
          </h3>

          {Array.isArray(question.options) &&
            question.options.map((option, optionIndex) => (
              <label
                key={optionIndex}
                style={{ display: "block", margin: "10px 0" }}
              >
                <input
                  type="radio"
                  name={`question-${index}`}
                  checked={Number(answers[index]) === optionIndex}
                  onChange={() => {
                    setAnswers((previous) => ({
                      ...previous,
                      [index]: optionIndex
                    }));
                  }}
                  disabled={score !== null}
                />
                {" "}{option}
              </label>
            ))}

          {score !== null && (
            <div>
              <p>
                {Number(answers[index]) === Number(question.answer)
                  ? "Correct!"
                  : `Correct answer: ${
                      question.options?.[Number(question.answer)] ??
                      "Unavailable"
                    }`}
              </p>

              <ReactMarkdown>
                {question.explanation || ""}
              </ReactMarkdown>
            </div>
          )}
        </div>
      ))}

      {questions.length > 0 && score === null && (
        <button
          onClick={submitQuiz}
          disabled={Object.keys(answers).length !== questions.length}
        >
          Submit Answers
        </button>
      )}

      {score !== null && (
        <div className="assessment-result">
          <h2>
            Your Score: {score}/{questions.length}
          </h2>

          <p>
            {score / questions.length >= 0.8
              ? "Great job! Your next quiz will be more challenging when possible."
              : score / questions.length < 0.5
                ? "Keep practising. Your next quiz will be easier when possible."
                : "Good effort! Your next quiz will stay at the same difficulty."}
          </p>

          <p>
            <strong>Next quiz difficulty:</strong>{" "}
            {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
          </p>

          <button onClick={startNextQuiz} disabled={loading}>
            {loading ? "Generating quiz..." : "Start Next Quiz"}
          </button>
        </div>
      )}
    </div>
  );
}

export default Assessment;

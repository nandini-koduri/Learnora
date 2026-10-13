
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const MATERIALS_API = "http://localhost:5000/api/materials";
const AI_API = "http://127.0.0.1:8000";

function Tutor() {
  const [question, setQuestion] = useState("");
  const [materials, setMaterials] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your Learnora AI tutor. Select a PDF and ask me something about your study material."
    }
  ]);

  const [loading, setLoading] = useState(false);

  // Load previously uploaded PDFs.
  useEffect(() => {
    const loadMaterials = async () => {
      try {
        const response = await fetch(`${MATERIALS_API}/history`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load PDFs.");
        }

        setMaterials(data.materials || []);
      } catch (error) {
        console.error("Materials history error:", error);
        setHistoryError("Could not load your PDF library. Check the backend.");
      } finally {
        setHistoryLoading(false);
      }
    };

    loadMaterials();
  }, []);

  const sendMessage = async () => {
    const userQuestion = question.trim();

    if (!userQuestion || loading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: userQuestion }
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const requestBody = {
        question: userQuestion
      };

      // Include the selected PDF filename when one is selected.
      if (selectedSource) {
        requestBody.source_name = selectedSource;
      }

      const response = await fetch(`${AI_API}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get an AI answer.");
      }

      const uniqueSources = [
        ...new Set(
          (data.sources || [])
            .filter(Boolean)
            .map((source) => String(source).trim())
            .filter(Boolean)
        )
      ];

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: data.answer || "No answer was returned.",
          sources: uniqueSources
        }
      ]);
    } catch (error) {
      console.error("Tutor API error:", error);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: `Sorry, I couldn't get an answer. ${error.message}. Please check that the backend and AI service are running.`,
          sources: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tutor">
      <h1>AI Tutor</h1>

      <p>Select the study material you want to ask questions about.</p>

      <div className="pdf-selector">
        <label htmlFor="study-pdf">
          <strong>Choose a PDF:</strong>
        </label>

        <select
          id="study-pdf"
          value={selectedSource}
          onChange={(event) => setSelectedSource(event.target.value)}
          disabled={historyLoading || loading}
        >
          <option value="">All uploaded materials</option>

          {materials.map((material) => (
            <option
              key={material.id || material.filename}
              value={material.originalName}
            >
              {material.originalName}
            </option>
          ))}
        </select>

        {historyLoading && <p>Loading your PDFs...</p>}

        {historyError && <p role="alert">{historyError}</p>}

        {!historyLoading && materials.length === 0 && (
          <p>No uploaded PDFs found. Upload a PDF in Study Materials first.</p>
        )}
      </div>

      <div className="chat-box" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <strong>
              {message.role === "user" ? "You" : "Learnora AI"}
            </strong>

            <div className="markdown-content">
              <ReactMarkdown>{message.text}</ReactMarkdown>
            </div>

            {message.role === "assistant" &&
              message.sources?.length > 0 && (
                <div className="message-sources">
                  <hr />
                  <strong>Sources used:</strong>
                  <ul>
                    {message.sources.map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <strong>Learnora AI</strong>
            <p>Thinking... Please wait.</p>
          </div>
        )}
      </div>

      <div className="chat-input">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about your course material..."
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              sendMessage();
            }
          }}
          disabled={loading}
          aria-label="Ask a question about your course material"
        />

        <button
          onClick={sendMessage}
          disabled={loading || !question.trim()}
        >
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default Tutor;

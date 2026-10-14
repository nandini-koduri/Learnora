
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./tutor-lavendar.css";

const MATERIALS_API = "http://localhost:5000/api/materials";
const TUTOR_API = "http://localhost:5000/api/tutor";
const AI_API = "http://127.0.0.1:8000";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "Hi! I'm your Learnora AI tutor. Select a PDF and ask me something about your study material."
};

function Tutor() {
  const [question, setQuestion] = useState("");
  const [materials, setMaterials] = useState([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadChats() {
    const response = await fetch(`${TUTOR_API}/chats`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load old chats.");
    }

    setChats(Array.isArray(data.chats) ? data.chats : []);
    return Array.isArray(data.chats) ? data.chats : [];
  }

  async function loadChat(chatId) {
    setError("");

    try {
      const response = await fetch(`${TUTOR_API}/chats/${encodeURIComponent(chatId)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not open this chat.");
      }

      const chat = data.chat;

      setActiveChatId(chat.id);
      setMessages(
        Array.isArray(chat.messages) && chat.messages.length
          ? chat.messages
          : [WELCOME_MESSAGE]
      );

      if (chat.sourceName) {
        setSelectedSource(
          materials.some(
            (material) =>
              (material.originalName || material.filename) === chat.sourceName
          )
            ? chat.sourceName
            : ""
        );
      } else {
        setSelectedSource("");
      }
    } catch (err) {
      setError(err.message || "Could not open this chat.");
    }
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const [materialsResponse, loadedChats] = await Promise.all([
          fetch(`${MATERIALS_API}/history`),
          loadChats()
        ]);

        const materialsData = await materialsResponse.json();

        if (!materialsResponse.ok) {
          throw new Error(materialsData.message || "Could not load PDFs.");
        }

        if (!active) return;

        setMaterials(
          Array.isArray(materialsData.materials)
            ? materialsData.materials
            : []
        );

        // Open the most recently updated chat automatically.
        if (loadedChats.length > 0) {
          await loadChat(loadedChats[0].id);
        }
      } catch (err) {
        if (active) {
          setError(
            `${err.message || "Could not load Tutor data."} Check that the backend is running.`
          );
        }
      } finally {
        if (active) setInitialLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, []);

  async function startNewChat() {
    if (loading) return;

    setError("");

    try {
      const response = await fetch(`${TUTOR_API}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create a new chat.");
      }

      const chat = data.chat;

      setActiveChatId(chat.id);
      setMessages([WELCOME_MESSAGE]);
      setQuestion("");
      setSelectedSource("");

      await loadChats();
    } catch (err) {
      setError(err.message || "Could not create a new chat.");
    }
  }

  async function deleteChat(chatId) {
    const confirmed = window.confirm(
      "Delete this chat permanently? This cannot be undone."
    );

    if (!confirmed) return;

    setError("");

    try {
      const response = await fetch(
        `${TUTOR_API}/chats/${encodeURIComponent(chatId)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete this chat.");
      }

      const remaining = await loadChats();

      if (activeChatId === chatId) {
        if (remaining.length > 0) {
          await loadChat(remaining[0].id);
        } else {
          setActiveChatId(null);
          setMessages([WELCOME_MESSAGE]);
          setSelectedSource("");
          setQuestion("");
        }
      }

      window.dispatchEvent(new Event("learnoraTutorUpdated"));
    } catch (err) {
      setError(err.message || "Could not delete this chat.");
    }
  }

  async function sendMessage() {
    const userQuestion = question.trim();

    if (!userQuestion || loading) return;

    setError("");
    setQuestion("");
    setLoading(true);

    let chatId = activeChatId;

    try {
      // Create a chat automatically if none is active.
      if (!chatId) {
        const createResponse = await fetch(`${TUTOR_API}/chats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(createData.message || "Could not create a chat.");
        }

        chatId = createData.chat.id;
        setActiveChatId(chatId);
      }

      setMessages((previous) => [
        ...previous,
        { id: `pending-${Date.now()}`, role: "user", text: userQuestion }
      ]);

      const requestBody = { question: userQuestion };

      if (selectedSource) {
        requestBody.source_name = selectedSource;
      }

      const response = await fetch(`${AI_API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to get an AI answer.");
      }

      const answer = data.answer || "No answer was returned.";
      const uniqueSources = [
        ...new Set(
          (data.sources || [])
            .filter(Boolean)
            .map((source) => String(source).trim())
            .filter(Boolean)
        )
      ];

      const answerMessage = {
        id: `answer-${Date.now()}`,
        role: "assistant",
        text: answer,
        sources: uniqueSources
      };

      setMessages((previous) => [...previous, answerMessage]);

      // Save this exchange under the active chat ID.
      const saveResponse = await fetch(
        `${TUTOR_API}/chats/${encodeURIComponent(chatId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: userQuestion,
            answer,
            sources: uniqueSources,
            sourceName: selectedSource || "All uploaded materials"
          })
        }
      );

      const saveData = await saveResponse.json();

      if (!saveResponse.ok) {
        throw new Error(
          `AI answered, but saving failed: ${saveData.message || "Unknown error"}`
        );
      }

      await loadChats();
      window.dispatchEvent(new Event("learnoraTutorUpdated"));
    } catch (err) {
      console.error("Tutor error:", err);

      setMessages((previous) => [
        ...previous,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: `Sorry, ${err.message || "something went wrong."} Please check the backend and Python AI service.`
        }
      ]);

      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tutor">
      <h1>AI Tutor</h1>
      <p>Ask questions about your study materials and revisit previous chats.</p>

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      <div
        className="tutor-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(210px, 260px) minmax(0, 1fr)",
          gap: "20px",
          alignItems: "start"
        }}
      >
        <aside
          className="tutor-sidebar"
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "12px",
            minWidth: 0
          }}
        >
          <button
            type="button"
            onClick={startNewChat}
            disabled={loading}
            style={{ width: "100%", marginBottom: "14px" }}
          >
            + New Chat
          </button>

          <h3>Old Chats</h3>

          {initialLoading && <p>Loading chats...</p>}

          {!initialLoading && chats.length === 0 && (
            <p>No saved chats yet. Start a new chat!</p>
          )}

          <div style={{ display: "grid", gap: "8px" }}>
            {chats.map((chat) => (
              <div
                key={chat.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px",
                  background:
                    activeChatId === chat.id ? "#eef2ff" : "transparent"
                }}
              >
                <button
                  type="button"
                  onClick={() => loadChat(chat.id)}
                  disabled={loading}
                  title={chat.title}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    overflowWrap: "anywhere",
                    border: "none",
                    background: "transparent",
                    padding: "4px",
                    cursor: "pointer"
                  }}
                >
                  {chat.title}
                  <small style={{ display: "block", marginTop: "4px" }}>
                    {chat.messageCount || 0} messages
                  </small>
                </button>

                <button
                  type="button"
                  onClick={() => deleteChat(chat.id)}
                  disabled={loading}
                  aria-label={`Delete ${chat.title}`}
                  style={{ marginTop: "6px" }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="tutor-conversation" style={{ minWidth: 0 }}>
          <div className="pdf-selector">
            <label htmlFor="study-pdf">
              <strong>Choose a PDF:</strong>
            </label>

            <select
              id="study-pdf"
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              disabled={loading}
            >
              <option value="">All uploaded materials</option>

              {materials.map((material) => (
                <option
                  key={material.id || material.filename}
                  value={material.originalName || material.filename}
                >
                  {material.originalName || material.filename}
                </option>
              ))}
            </select>

            {materials.length === 0 && (
              <p>No PDFs found. Upload one in Study Materials first.</p>
            )}
          </div>

          <div className="chat-box" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={message.id || `${message.role}-${index}`}
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
                        {message.sources.map((source, sourceIndex) => (
                          <li key={`${source}-${sourceIndex}`}>
                            {source}
                          </li>
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
                if (event.key === "Enter") sendMessage();
              }}
              disabled={loading}
              aria-label="Ask a question about your course material"
            />

            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !question.trim()}
            >
              {loading ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Tutor;

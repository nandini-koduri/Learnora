
import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = "http://localhost:5000/api/materials";

function Materials() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [materials, setMaterials] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  // Prevent overlapping history requests.
  const historyRequestRef = useRef(null);

  const loadMaterials = useCallback(async (force = false) => {
    if (historyRequestRef.current && !force) {
      return historyRequestRef.current;
    }

    setHistoryLoading(true);
    setHistoryError("");

    const request = (async () => {
      try {
        const response = await fetch(`${API_URL}/history`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Could not load saved materials."
          );
        }

        const savedMaterials = Array.isArray(data)
          ? data
          : data.materials;

        if (!Array.isArray(savedMaterials)) {
          throw new Error("Invalid materials history response.");
        }

        setMaterials(savedMaterials);
      } catch (error) {
        console.error("Materials history error:", error);
        setHistoryError(
          error.message ||
            "Could not load saved materials. Check the backend."
        );
      } finally {
        setHistoryLoading(false);
      }
    })();

    historyRequestRef.current = request;

    try {
      await request;
    } finally {
      if (historyRequestRef.current === request) {
        historyRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleUpload = async () => {
    if (!file) {
      setSuccess(false);
      setMessage("Please select a PDF first.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "PDF upload failed.");
      }

      setSuccess(true);
      setMessage(data.message || "PDF uploaded successfully!");
      setFile(null);

      // Reload history after a successful upload.
      await loadMaterials(true);
    } catch (error) {
      console.error("PDF upload error:", error);
      setSuccess(false);

      setMessage(
        error.message === "Failed to fetch"
          ? "Could not connect to the backend. Check whether it is running."
          : error.message || "PDF upload failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date unavailable";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString();
  };

  const formatSize = (bytes) => {
    if (typeof bytes !== "number" || !Number.isFinite(bytes)) {
      return "";
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="materials-page">
      <div className="materials-heading">
        <span className="materials-eyebrow">
          YOUR LEARNING LIBRARY
        </span>

        <h1>Study Materials</h1>

        <p>
          Upload your study materials and build your personalized
          AI learning space.
        </p>
      </div>

      <div className="materials-upload-card">
        <div className="materials-upload-icon">📚</div>

        <h2>Upload your study material</h2>

        <p>
          Select a PDF textbook, lecture notes, or study document
          to get started.
        </p>

        <label className="materials-file-picker">
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => {
              const selectedFile =
                event.target.files?.[0] || null;

              setFile(selectedFile);
              setMessage("");
              setSuccess(false);
            }}
          />

          <span className="materials-file-button">
            Choose PDF
          </span>

          <span className="materials-file-hint">
            {file ? "PDF selected" : "Click to select a file"}
          </span>
        </label>

        {file && (
          <div className="materials-selected-file">
            <span className="materials-pdf-icon">📄</span>

            <div className="materials-file-details">
              <strong>{file.name}</strong>
              <span>{formatSize(file.size)}</span>
            </div>

            <button
              type="button"
              className="materials-remove-button"
              onClick={() => {
                setFile(null);
                setMessage("");
                setSuccess(false);
              }}
              disabled={loading}
              aria-label="Remove selected PDF"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          className="materials-upload-button"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload PDF →"}
        </button>

        <p className="materials-file-note">
          Supported format: PDF
        </p>

        {message && (
          <div
            className={
              success
                ? "materials-status materials-success"
                : "materials-status materials-error"
            }
            role="status"
          >
            <span>{success ? "✓" : "!"}</span>
            {message}
          </div>
        )}
      </div>

      <section className="materials-history">
        <div className="materials-heading">
          <span className="materials-eyebrow">
            YOUR SAVED FILES
          </span>

          <h2>Your Uploaded Materials</h2>

          <p>
            Your successfully processed PDFs will appear here,
            including after you refresh the page.
          </p>
        </div>

        {historyLoading && (
          <p>Loading your saved materials...</p>
        )}

        {!historyLoading && historyError && (
          <div
            className="materials-status materials-error"
            role="status"
          >
            <span>!</span>
            {historyError}

            <button
              type="button"
              onClick={() => loadMaterials(true)}
            >
              Retry
            </button>
          </div>
        )}

        {!historyLoading &&
          !historyError &&
          materials.length === 0 && (
            <div className="materials-upload-card">
              <div className="materials-upload-icon">📂</div>
              <h3>No saved materials yet</h3>
              <p>
                Upload your first PDF to start building your library.
              </p>
            </div>
          )}

        {!historyLoading &&
          !historyError &&
          materials.length > 0 && (
            <div className="materials-history-list">
              {materials.map((material, index) => {
                const materialId =
                  material.id || material.filename;

                return (
                  <article
                    className="materials-selected-file"
                    key={materialId || index}
                  >
                    <span className="materials-pdf-icon">📄</span>

                    <div className="materials-file-details">
                      <strong>
                        {material.originalName ||
                          material.filename ||
                          "Study material.pdf"}
                      </strong>

                      <span>
                        {material.pages ?? "—"} pages
                        {" · "}
                        {formatSize(material.size)}
                      </span>

                      <span>
                        Uploaded: {formatDate(material.uploadedAt)}
                      </span>

                      <span>
                        Chunks stored:{" "}
                        {material.chunksStored ?? "—"}
                      </span>
                    </div>

                    {materialId && (
                      <a
                        className="materials-view-link"
                        href={`${API_URL}/view/${encodeURIComponent(
                          materialId
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View PDF ↗
                      </a>
                    )}

                    <span title="Saved successfully">✓</span>
                  </article>
                );
              })}
            </div>
          )}

        <button
          type="button"
          className="materials-upload-button"
          onClick={() => loadMaterials(true)}
          disabled={historyLoading}
        >
          {historyLoading ? "Refreshing..." : "Refresh History"}
        </button>
      </section>

      <div className="materials-info-grid">
        <div className="materials-info-card">
          <span>📖</span>
          <h3>Study from your PDFs</h3>
          <p>
            Keep your learning materials ready in one place.
          </p>
        </div>

        <div className="materials-info-card">
          <span>🤖</span>
          <h3>Learn with AI</h3>
          <p>
            Use the AI Tutor to explore your study content.
          </p>
        </div>

        <div className="materials-info-card">
          <span>📝</span>
          <h3>Test your knowledge</h3>
          <p>
            Practice with quizzes and review your progress.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Materials;

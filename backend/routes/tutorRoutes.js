
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const dataDir = path.join(__dirname, "..", "data");
const historyFile = path.join(dataDir, "tutorHistory.json");
const chatsFile = path.join(dataDir, "tutorChats.json");

fs.mkdirSync(dataDir, { recursive: true });

function initializeFile(file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf8");
  }
}

initializeFile(historyFile);
initializeFile(chatsFile);

function readJSON(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(data) ? data : [];
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeTitle(question) {
  const cleaned = question.replace(/\s+/g, " ").trim();
  return cleaned.length > 45
    ? `${cleaned.slice(0, 45).trim()}...`
    : cleaned || "New Chat";
}

function getChats() {
  let chats = readJSON(chatsFile);

  // Migrate existing question-answer entries without deleting the old file.
  if (chats.length === 0) {
    const oldHistory = readJSON(historyFile);
    const migrated = oldHistory
      .slice()
      .reverse()
      .map((entry) => {
        const createdAt = entry.createdAt || new Date().toISOString();

        return {
          id: `legacy-${entry.id || makeId()}`,
          title: makeTitle(entry.question || "Previous conversation"),
          createdAt,
          updatedAt: createdAt,
          sourceName: entry.sourceName || "",
          messages: [
            {
              id: `${makeId()}-q`,
              role: "user",
              text: entry.question || "",
              createdAt
            },
            {
              id: `${makeId()}-a`,
              role: "assistant",
              text: entry.answer || "",
              sources: Array.isArray(entry.sources) ? entry.sources : [],
              createdAt
            }
          ]
        };
      });

    if (migrated.length > 0) {
      chats = migrated;
      writeJSON(chatsFile, chats);
    }
  }

  return chats;
}

// GET /api/tutor/chats — list saved chats.
router.get("/chats", (req, res) => {
  try {
    const chats = getChats()
      .map(({ id, title, createdAt, updatedAt, sourceName, messages }) => ({
        id,
        title,
        createdAt,
        updatedAt,
        sourceName,
        messageCount: messages.length
      }))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ status: "success", chats });
  } catch (error) {
    console.error("Could not load chats:", error);
    res.status(500).json({
      status: "error",
      message: "Could not load saved chats."
    });
  }
});

// POST /api/tutor/chats — create a new empty chat.
router.post("/chats", (req, res) => {
  try {
    const chats = getChats();
    const now = new Date().toISOString();

    const chat = {
      id: makeId(),
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
      sourceName: "",
      messages: []
    };

    chats.push(chat);
    writeJSON(chatsFile, chats);

    res.status(201).json({ status: "success", chat });
  } catch (error) {
    console.error("Could not create chat:", error);
    res.status(500).json({
      status: "error",
      message: "Could not create a new chat."
    });
  }
});

// GET /api/tutor/chats/:id — load a complete conversation.
router.get("/chats/:id", (req, res) => {
  try {
    const chat = getChats().find((item) => item.id === req.params.id);

    if (!chat) {
      return res.status(404).json({
        status: "error",
        message: "Chat not found."
      });
    }

    res.json({ status: "success", chat });
  } catch (error) {
    console.error("Could not open chat:", error);
    res.status(500).json({
      status: "error",
      message: "Could not open this chat."
    });
  }
});

// POST /api/tutor/chats/:id/messages — save a message exchange.
router.post("/chats/:id/messages", (req, res) => {
  try {
    const { question, answer, sources, sourceName } = req.body;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "A question and answer are required."
      });
    }

    if (question.length > 10000 || answer.length > 50000) {
      return res.status(400).json({
        status: "error",
        message: "The question or answer is too long."
      });
    }

    const chats = getChats();
    const chat = chats.find((item) => item.id === req.params.id);

    if (!chat) {
      return res.status(404).json({
        status: "error",
        message: "Chat not found."
      });
    }

    const now = new Date().toISOString();
    const cleanSources = Array.isArray(sources)
      ? sources
          .filter((item) => typeof item === "string")
          .slice(0, 30)
      : [];

    chat.messages.push(
      {
        id: makeId(),
        role: "user",
        text: question.trim(),
        createdAt: now
      },
      {
        id: makeId(),
        role: "assistant",
        text: answer.trim(),
        sources: cleanSources,
        createdAt: now
      }
    );

    if (chat.messages.length === 2 && chat.title === "New Chat") {
      chat.title = makeTitle(question);
    }

    chat.sourceName =
      typeof sourceName === "string" ? sourceName : chat.sourceName;
    chat.updatedAt = now;

    writeJSON(chatsFile, chats);

    // Keep the existing dashboard activity history working.
    const history = readJSON(historyFile);
    history.unshift({
      id: makeId(),
      chatId: chat.id,
      question: question.trim(),
      answer: answer.trim(),
      sources: cleanSources,
      sourceName: chat.sourceName,
      createdAt: now
    });
    writeJSON(historyFile, history.slice(0, 500));

    res.status(201).json({
      status: "success",
      message: "Conversation saved.",
      chat
    });
  } catch (error) {
    console.error("Could not save chat messages:", error);
    res.status(500).json({
      status: "error",
      message: "Could not save this conversation."
    });
  }
});

// DELETE /api/tutor/chats/:id — delete one chat.
router.delete("/chats/:id", (req, res) => {
  try {
    const chats = getChats();
    const updatedChats = chats.filter(
      (item) => item.id !== req.params.id
    );

    if (updatedChats.length === chats.length) {
      return res.status(404).json({
        status: "error",
        message: "Chat not found."
      });
    }

    writeJSON(chatsFile, updatedChats);

    res.json({
      status: "success",
      message: "Chat deleted."
    });
  } catch (error) {
    console.error("Could not delete chat:", error);
    res.status(500).json({
      status: "error",
      message: "Could not delete this chat."
    });
  }
});

// Keep the existing history API for Dashboard compatibility.
router.get("/history", (req, res) => {
  try {
    res.json({
      status: "success",
      history: readJSON(historyFile)
    });
  } catch (error) {
    console.error("Could not read tutor history:", error);
    res.status(500).json({
      status: "error",
      message: "Could not load tutor history."
    });
  }
});

// Keep the old history save endpoint available for compatibility.
router.post("/history", (req, res) => {
  try {
    const { question, answer, sources, sourceName } = req.body;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      typeof answer !== "string" ||
      !answer.trim()
    ) {
      return res.status(400).json({
        status: "error",
        message: "A question and answer are required."
      });
    }

    if (question.length > 10000 || answer.length > 50000) {
      return res.status(400).json({
        status: "error",
        message: "The question or answer is too long."
      });
    }

    const history = readJSON(historyFile);
    const entry = {
      id: makeId(),
      question: question.trim(),
      answer: answer.trim(),
      sources: Array.isArray(sources)
        ? sources.filter((item) => typeof item === "string").slice(0, 30)
        : [],
      sourceName: typeof sourceName === "string" ? sourceName : "",
      createdAt: new Date().toISOString()
    };

    history.unshift(entry);
    writeJSON(historyFile, history.slice(0, 500));

    res.status(201).json({
      status: "success",
      message: "Tutor conversation saved.",
      entry
    });
  } catch (error) {
    console.error("Tutor history save error:", error);
    res.status(500).json({
      status: "error",
      message: "Could not save tutor conversation."
    });
  }
});

module.exports = router;

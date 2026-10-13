# Learnora — AI-Powered Personalized Learning

Learnora is an AI-powered study companion designed to help students learn more effectively from their own study materials. It allows students to upload PDFs, ask questions based on their selected material, practice AI-generated assessments, and track their learning progress.

## Problem Statement

Students often spend a lot of time searching through textbooks and notes to understand concepts and prepare for exams. Generic AI tools may provide answers that are not directly connected to a student's own study material.

## Our Solution

Learnora connects AI assistance with uploaded study materials to provide a more focused learning experience. Students can study from their PDFs, interact with an AI tutor, test their understanding, and review their assessment performance.

## Features

- **Study Material Upload:** Upload PDF documents and extract text for learning.
- **AI Tutor:** Ask questions with context from the selected study material.
- **Context-Aware Learning:** Retrieve relevant information from stored document chunks.
- **AI-Generated Assessments:** Generate practice questions to test understanding.
- **Progress Tracking:** Review quiz scores and assessment history.
- **Organized Learning Experience:** Access study materials, tutoring, assessments, and progress through a web interface.

## Technology Stack

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **AI Service:** Python, Flask
- **AI Model:** Google Gemini API
- **Vector Database:** ChromaDB
- **Document Processing:** PDF text extraction and chunking

## Project Architecture

1. The React frontend allows students to upload PDFs and interact with the application.
2. The Express backend handles material-related API requests and file uploads.
3. The Python AI service processes learning content and supports AI-related operations.
4. ChromaDB stores document chunks for relevant-content retrieval.
5. Gemini supports AI-powered tutoring and assessment generation.

## Project Structure

```text
Learnora/
├── frontend/
├── backend/
│   ├── routes/
│   └── server.js
├── ai-service/
│   ├── app.py
│   └── vector_store.py
└── .gitignore
```

## Running the Project Locally

### Prerequisites

Install the following before starting:

- Node.js and npm
- Python 3
- A Google Gemini API key

### 1. Configure the AI Service

Create a `.env` file inside `ai-service/` and add your own API key using the environment variable name expected by your application.

Do not upload this file or expose your API key publicly.

Install the Python dependencies listed in your project's dependency file, then start the Flask service using the appropriate Python environment.

### 2. Start the Backend

Open a terminal in the `backend/` folder, install dependencies, and start the server using the script configured in `backend/package.json`.

The backend is configured to run at `http://localhost:5000` in the development setup.

### 3. Start the Frontend

Open another terminal in the `frontend/` folder, install dependencies, and start the Vite development server.

The frontend is configured to run at `http://localhost:5173` in the development setup.

Keep the backend and AI service running while using the application.

> Note: Exact dependency installation commands and environment variable names depend on the configuration files included in the project.

## Security

- Keep API keys and `.env` files private.
- Do not commit virtual environments, `node_modules`, generated vector database files, or private uploaded documents.
- Use your own API key and review the applicable API usage limits.

## Future Improvements

- Adaptive learning paths based on student performance.
- More detailed concept and prerequisite mapping.
- Improved source citations with page-level references.
- Support for additional study-material formats.
- Personalized revision recommendations.

## Project

**Learnora** — making study sessions more focused, interactive, and personalized.
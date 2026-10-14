# Learnora – AI-Powered Personalized Learning Platform

Learnora is an AI-powered personalized learning companion designed to make studying more interactive, accessible, and efficient. It brings study material management, AI-assisted tutoring, adaptive assessments, and learning progress tracking together in one platform.

## Demo Video

▶️ **Watch the Learnora Demo:** [YouTube Project Demo](https://youtu.be/9Ujg8YsVvxs)

## Features

- **Study Materials:** Upload and manage PDF study materials.
- **AI Tutor:** Ask questions and get learning assistance based on study materials.
- **Adaptive Assessments:** Practice questions to test your understanding.
- **Learning Progress:** Review learning activities and quiz history.
- **Document Processing:** Extract text from PDFs and prepare content for AI-powered retrieval.

## Technology Stack

- **Frontend:** React, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **AI Service:** Python, Flask
- **Document Processing:** PDF text extraction and text chunking
- **Knowledge Retrieval:** ChromaDB

## Project Structure

```text
Learnora/
├── frontend/       # React user interface
├── backend/        # Express API and application logic
└── ai-service/     # Python AI and document processing
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python
- Git

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/nandini-koduri/Learnora.git
   ```

2. Navigate to the project directory:

   ```bash
   cd Learnora
   ```

3. Install frontend and backend dependencies in their respective directories:

   ```bash
   cd frontend
   npm install
   ```

   ```bash
   cd ../backend
   npm install
   ```

4. Set up the Python environment and install the AI service dependencies according to the configuration in `ai-service/`.

5. Configure the required environment variables and API credentials locally. Never commit secrets or `.env` files.

6. Start the frontend, backend, and AI service using their respective project configurations.

## Project Goal

Learnora aims to support personalized learning by combining study resources, AI-assisted explanations, assessments, and progress tracking in a single application.

## Future Improvements

- More personalized learning recommendations
- Improved assessment difficulty adaptation
- Expanded document and learning resource support
- More detailed learning analytics

## Author

**Nandini Koduri**

GitHub: [nandini-koduri](https://github.com/nandini-koduri)

---

*Developed as an AI-powered personalized learning project.*

import os
import json
import re
import time
import pymupdf
import io
import pytesseract
from PIL import Image
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from google import genai
from vector_store import add_chunks, search_chunks

# 1. APP CONFIGURATION
load_dotenv()
app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None
MODEL_NAME = "gemini-3.5-flash-lite"

# 2. GEMINI AI HELPER
def generate_ai_text(prompt):
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt
            )
            return response.text
        except Exception as error:
            error_message = str(error)
            if "503" in error_message or "UNAVAILABLE" in error_message:
                if attempt < 2:
                    time.sleep(2 ** (attempt + 1))
                    continue
            raise

# 3. RETRIEVE STUDY MATERIAL
def get_study_context(question, number_of_results=5, source_name=None):
    results = search_chunks(
        question,
        number_of_results=number_of_results,
        source_name=source_name
    )
    if not results:
        return "", []
    context_parts = []
    for item in results[:number_of_results]:
        context_parts.append(
            f"Source: {item['source']}\n"
            f"Chunk: {item['chunk_index']}\n"
            f"Text: {item['text']}"
        )
    context = "\n\n".join(context_parts)
    sources = list(dict.fromkeys(item["source"] for item in results))
    return context, sources

# 4. HOME AND HEALTH ROUTES
@app.route("/")
def home():
    return jsonify({"message": "Learnora AI Service is running!"})

@app.route("/health")
def health():
    return jsonify({
        "status": "success",
        "message": "AI service connected successfully"
    })

# 5. PDF EXTRACTION, CHUNKING AND CHROMADB STORAGE
@app.route("/upload-pdf", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({
            "status": "error",
            "message": "No PDF file received."
        }), 400

    uploaded_file = request.files["file"]
    if not uploaded_file.filename:
        return jsonify({
            "status": "error",
            "message": "Please select a PDF file."
        }), 400

    filename = os.path.basename(uploaded_file.filename)
    if not filename.lower().endswith(".pdf"):
        return jsonify({
            "status": "error",
            "message": "Only PDF files are allowed."
        }), 400

    document = None
    try:
        print("Step 1: Received PDF:", filename)
        pdf_bytes = uploaded_file.read()

        if not pdf_bytes:
            return jsonify({
                "status": "error",
                "message": "The uploaded PDF is empty."
            }), 400

        
        print("Step 2: Extracting PDF text with PyMuPDF...")
        document = pymupdf.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(document)
        extracted_pages = []

        # Update this path if Tesseract was installed elsewhere.
        pytesseract.pytesseract.tesseract_cmd = (
            r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )

        for page_number, page in enumerate(document, start=1):
            page_text = page.get_text("text").strip()

            # If selectable text is missing, try OCR on the page image.
            if len(page_text) < 20:
                print(
                    f"Page {page_number}: little/no selectable text. "
                    "Trying OCR..."
                )

                try:
                    pix = page.get_pixmap(
                        matrix=pymupdf.Matrix(2, 2),
                        alpha=False
                    )
                    image_bytes = pix.tobytes("png")
                    image = Image.open(io.BytesIO(image_bytes))

                    ocr_text = pytesseract.image_to_string(
                        image,
                        lang="eng"
                    ).strip()

                    if ocr_text:
                        page_text = ocr_text
                        print(
                            f"Page {page_number}: OCR extracted "
                            f"{len(page_text)} characters."
                        )
                    else:
                        print(f"Page {page_number}: OCR found no text.")

                except Exception as ocr_error:
                    app.logger.warning(
                        "OCR failed on page %s: %s",
                        page_number,
                        ocr_error
                    )

            else:
                print(
                    f"Page {page_number}: extracted "
                    f"{len(page_text)} selectable characters."
                )

            if page_text:
                extracted_pages.append(
                    f"[Page {page_number}]\n{page_text}"
                )

        extracted_text = "\n\n".join(extracted_pages).strip()

        print("Total pages:", page_count)
        print("Extracted text length:", len(extracted_text))

        if not extracted_text:
            return jsonify({
                "status": "error",
                "message": (
                    "Could not extract readable text from this PDF. "
                    "It may be scanned, image-only, protected, or unclear. "
                    "Please try a clearer PDF."
                ),
                "pages": page_count,
                "text_length": 0
            }), 400

        print("Step 3: PDF text extracted successfully!")
        chunk_size = 1000
        overlap = 150
        step_size = chunk_size - overlap
        chunks = []

        for start in range(0, len(extracted_text), step_size):
            chunk = extracted_text[start:start + chunk_size].strip()
            if chunk:
                chunks.append(chunk)

        if not chunks:
            return jsonify({
                "status": "error",
                "message": "No valid text chunks could be created."
            }), 400

        print("Step 4: Number of chunks:", len(chunks))
        print("Step 5: Storing chunks in ChromaDB...")
        stored_count = add_chunks(chunks, filename)
        print("Step 6: ChromaDB storage successful!")
        print("Chunks stored:", stored_count)

        return jsonify({
            "status": "success",
            "message": "PDF uploaded, text extracted and stored in ChromaDB.",
            "source": filename,
            "pages": page_count,
            "text_length": len(extracted_text),
            "chunks_created": len(chunks),
            "chunks_stored": stored_count
        }), 200

    except Exception:
        app.logger.exception("PDF processing or ChromaDB storage failed")
        return jsonify({
            "status": "error",
            "message": (
                "PDF processing or ChromaDB storage failed. "
                "Check the AI service terminal."
            )
        }), 500

    finally:
        if document is not None:
            document.close()

# 6. INGEST EXISTING TEXT CHUNKS
@app.route("/ingest", methods=["POST"])
def ingest():
    data = request.get_json(silent=True) or {}
    chunks = data.get("chunks", [])
    source_name = data.get("source_name", "study_material.pdf")

    if not isinstance(chunks, list) or not chunks:
        return jsonify({
            "status": "error",
            "message": "No text chunks received."
        }), 400

    chunks = [
        chunk.strip()
        for chunk in chunks
        if isinstance(chunk, str) and chunk.strip()
    ]

    if not chunks:
        return jsonify({
            "status": "error",
            "message": "No valid text chunks received."
        }), 400

    try:
        count = add_chunks(chunks, source_name)
        return jsonify({
            "status": "success",
            "message": "Study material stored in ChromaDB.",
            "source": source_name,
            "chunks_stored": count
        })
    except Exception:
        app.logger.exception("ChromaDB storage error")
        return jsonify({
            "status": "error",
            "message": "Could not store chunks in ChromaDB."
        }), 500

# 7. SEARCH STORED STUDY MATERIAL
@app.route("/search", methods=["POST"])
def search():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "")

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "status": "error",
            "message": "Please provide a question."
        }), 400

    question = question.strip()

    try:
        results = search_chunks(question)
        return jsonify({
            "status": "success",
            "question": question,
            "results": results
        })
    except Exception:
        app.logger.exception("Search error")
        return jsonify({
            "status": "error",
            "message": "Could not search study material."
        }), 500

# 8. AI TUTOR - PDF + GENERAL QUESTIONS

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json(silent=True) or {}
    question = data.get("question", "")
    source_name = data.get("source_name")

    if not isinstance(question, str) or not question.strip():
        return jsonify({
            "status": "error",
            "message": "Please provide a question."
        }), 400

    question = question.strip()

    if client is None:
        return jsonify({
            "status": "error",
            "message": "Gemini API key is missing. Check ai-service/.env."
        }), 500

    context = ""
    retrieved_sources = []

    try:
        try:
            context, retrieved_sources = get_study_context(
                question,
                source_name=source_name
            )
        except Exception:
            app.logger.exception(
                "Study material retrieval failed; using general knowledge"
            )
            context = ""
            retrieved_sources = []

        prompt = f"""
You are Learnora, a friendly and helpful AI tutor.

Answer the student's question clearly and accurately.

You must return ONLY valid JSON in this exact structure:
{{
    "answer": "Your complete answer here",
    "used_study_material": false
}}

Rules for deciding used_study_material:

1. Set it to true ONLY if the supplied study material contains
   relevant information that you actually use to answer the question.

2. Set it to false if the material is unrelated to the question,
   does not contain the information needed, or you answer using
   general knowledge instead.

3. The mere presence of retrieved text does NOT mean you used it.

4. If the material does not answer the question, explain that briefly
   in the answer, then provide a separate general explanation if useful.
   In that case, set used_study_material to false unless you also
   substantively use relevant information from the material.

5. Do not claim general knowledge came from the study material.

6. Use simple, clear English. Explain step by step and give examples
   when useful.

7. The answer field must contain the complete answer as a string.
   Do not add a sources list to the answer.

STUDY MATERIAL:
{context if context else "No study material was retrieved."}

STUDENT QUESTION:
{question}
"""

        raw_text = generate_ai_text(prompt)

        if not raw_text:
            raise ValueError("Gemini returned an empty answer.")

        # Parse Gemini's JSON response.
        cleaned = raw_text.strip()

        # Remove Markdown fences if Gemini includes them.
        cleaned = re.sub(
            r"^\s*```(?:json)?\s*",
            "",
            cleaned,
            flags=re.IGNORECASE
        )
        cleaned = re.sub(r"\s*```\s*$", "", cleaned)

        try:
            ai_result = json.loads(cleaned)
        except json.JSONDecodeError:
            # If the response contains extra text, extract the JSON object.
            match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)

            if not match:
                raise ValueError(
                    "Gemini did not return valid JSON."
                )

            ai_result = json.loads(match.group(0))

        answer = ai_result.get("answer")
        used_material = ai_result.get("used_study_material", False)

        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("Gemini returned an invalid answer.")

        # Be conservative: invalid or missing flags must not expose sources.
        if not isinstance(used_material, bool):
            used_material = False

        # Sources are displayed only when the model says relevant material
        # was actually used AND retrieved context exists.
        if used_material and context:
            response_sources = retrieved_sources
            answer_type = "pdf_based"
        else:
            response_sources = []
            answer_type = "general"

        return jsonify({
            "status": "success",
            "question": question,
            "answer": answer.strip(),
            "sources": response_sources,
            "answer_type": answer_type
        }), 200

    except Exception:
        app.logger.exception("AI tutor error")
        return jsonify({
            "status": "error",
            "message": (
                "Could not generate an answer. "
                "Check the AI service terminal."
            )
        }), 500
    
# 9. ADAPTIVE QUIZ GENERATION
@app.route("/quiz", methods=["POST"])
def quiz():
    data = request.get_json(silent=True) or {}
    source_name = data.get("source_name")
    difficulty = str(data.get("difficulty", "easy")).lower()
    question_count = data.get("question_count", 5)

    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "easy"

    try:
        question_count = int(question_count)
    except (TypeError, ValueError):
        question_count = 5

    question_count = max(1, min(question_count, 10))

    if client is None:
        return jsonify({
            "status": "error",
            "message": "Gemini API key is missing. Check ai-service/.env."
        }), 500

    try:
        context, sources = get_study_context(
            "main concepts definitions examples and important facts",
            number_of_results=10,
            source_name=source_name
        )

        if not context:
            return jsonify({
                "status": "error",
                "message": "No study material found. Upload a PDF first."
            }), 404

        prompt = f"""
Create exactly {question_count} multiple-choice quiz questions
at {difficulty} difficulty using ONLY the study material below.

Return ONLY valid JSON without Markdown code fences.
Use this structure:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Short explanation based on the material"
    }}
  ]
}}

Rules:
- Each question must have exactly four options.
- "answer" must be an integer from 0 to 3.
- Every question must have one unambiguous correct answer.
- Explanations must be short and helpful.
- Do not include questions unsupported by the material.

STUDY MATERIAL:
{context}
"""

        raw_text = generate_ai_text(prompt)
        cleaned = re.sub(
            r"^\s*```(?:json)?\s*|\s*```\s*$",
            "",
            raw_text,
            flags=re.IGNORECASE
        )

        quiz_data = json.loads(cleaned)
        questions = quiz_data.get("questions", [])

        if not isinstance(questions, list) or not questions:
            raise ValueError("Gemini returned no quiz questions.")

        valid_questions = []

        for item in questions:
            if not isinstance(item, dict):
                continue

            question_text = item.get("question")
            options = item.get("options")
            answer = item.get("answer")

            if (
                not isinstance(question_text, str)
                or not isinstance(options, list)
                or len(options) != 4
                or not all(isinstance(option, str) for option in options)
                or isinstance(answer, bool)
                or not isinstance(answer, int)
                or answer not in range(4)
            ):
                continue

            valid_questions.append({
                "question": question_text,
                "options": options,
                "answer": answer,
                "explanation": str(item.get("explanation", ""))
            })

        if not valid_questions:
            raise ValueError("Gemini returned invalid quiz questions.")

        return jsonify({
            "status": "success",
            "difficulty": difficulty,
            "questions": valid_questions[:question_count],
            "sources": sources
        })

    except Exception:
        app.logger.exception("Quiz generation error")
        return jsonify({
            "status": "error",
            "message": (
                "Could not generate the quiz. "
                "Check the AI service terminal."
            )
        }), 500

# 10. ERROR HANDLERS AND START SERVER
@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "status": "error",
        "message": "PDF must be 20 MB or smaller."
    }), 413

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
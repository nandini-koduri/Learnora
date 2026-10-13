
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// --------------------------------------------------
// 1. PERMANENT STORAGE FOLDERS
// --------------------------------------------------

const uploadDir = path.join(__dirname, "..", "uploads");
const dataDir = path.join(__dirname, "..", "data");
const metadataFile = path.join(dataDir, "materials.json");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

if (!fs.existsSync(metadataFile)) {
    fs.writeFileSync(metadataFile, "[]", "utf8");
}

// Read saved upload history.
function readMaterials() {
    try {
        const data = JSON.parse(
            fs.readFileSync(metadataFile, "utf8")
        );

        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Could not read materials history:", error);
        return [];
    }
}

// Save upload history.
function saveMaterials(materials) {
    fs.writeFileSync(
        metadataFile,
        JSON.stringify(materials, null, 2),
        "utf8"
    );
}

// --------------------------------------------------
// 2. FILE UPLOAD CONFIGURATION
// --------------------------------------------------

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const safeName = path.basename(file.originalname)
            .replace(/[^a-zA-Z0-9._-]/g, "_");

        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 20 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const isPdf =
            file.mimetype === "application/pdf" ||
            path.extname(file.originalname).toLowerCase() === ".pdf";

        if (!isPdf) {
            return cb(new Error("Only PDF files are allowed."));
        }

        cb(null, true);
    }
});

// --------------------------------------------------
// 3. TEST ROUTE
// --------------------------------------------------

router.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "Materials API is working"
    });
});

// --------------------------------------------------
// 4. GET SAVED MATERIALS HISTORY
// --------------------------------------------------

router.get("/history", (req, res) => {
    try {
        const materials = readMaterials();

        res.json({
            status: "success",
            materials
        });
    } catch (error) {
        console.error("History error:", error);

        res.status(500).json({
            status: "error",
            message: "Could not load materials history."
        });
    }
});

// --------------------------------------------------
// 5. UPLOAD PDF AND STORE IT PERMANENTLY
// --------------------------------------------------

router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: "error",
            message: "Please select a PDF file."
        });
    }

    const filePath = req.file.path;
    let savedToHistory = false;

    try {
        console.log("PDF uploaded:", req.file.originalname);

        const pdfBuffer = fs.readFileSync(filePath);
        const formData = new FormData();

        formData.append(
            "file",
            new Blob([pdfBuffer], { type: "application/pdf" }),
            req.file.originalname
        );

        let aiResponse;

        try {
            aiResponse = await fetch(
                "http://127.0.0.1:8000/upload-pdf",
                {
                    method: "POST",
                    body: formData,
                    signal: AbortSignal.timeout(120000)
                }
            );
        } catch (error) {
            console.error("AI service connection error:", error.message);

            // Failed processing: remove incomplete upload.
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return res.status(502).json({
                status: "error",
                message: "Could not connect to the Python AI service."
            });
        }

        let result;

        try {
            result = await aiResponse.json();
        } catch (error) {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return res.status(502).json({
                status: "error",
                message: "AI service returned an invalid response."
            });
        }

        if (!aiResponse.ok || result.status !== "success") {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return res.status(aiResponse.status || 500).json({
                status: "error",
                message: result.message || "PDF processing failed."
            });
        }

        // PDF processing succeeded. Save metadata permanently.
        const materials = readMaterials();

        const material = {
            id: req.file.filename,
            originalName: req.file.originalname,
            filename: req.file.filename,
            pages: result.pages,
            textLength: result.text_length,
            chunksStored: result.chunks_stored,
            size: req.file.size,
            uploadedAt: new Date().toISOString()
        };

        materials.unshift(material);
        saveMaterials(materials);
        savedToHistory = true;

        console.log("Material saved to history:", material.originalName);

        return res.status(200).json({
            status: "success",
            message: "PDF uploaded and saved to your learning library!",
            material
        });

    } catch (error) {
        console.error("PDF upload error:", error);

        // Keep a successfully processed PDF if history was saved.
        // Otherwise remove the incomplete upload.
        if (!savedToHistory && fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (cleanupError) {
                console.error("Cleanup error:", cleanupError.message);
            }
        }

        return res.status(500).json({
            status: "error",
            message: "Could not save the PDF. Check the backend terminal."
        });
    }
});

// --------------------------------------------------
// 6. UPLOAD ERROR HANDLER
// --------------------------------------------------

router.use((error, req, res, next) => {
    console.error("Upload error:", error.message);

    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            status: "error",
            message:
                error.code === "LIMIT_FILE_SIZE"
                    ? "PDF must be 20 MB or smaller."
                    : error.message
        });
    }

    return res.status(400).json({
        status: "error",
        message: error.message || "File upload failed."
    });
});

/* Open a previously uploaded PDF safely */
router.get("/view/:filename", (req, res) => {
    const filename = req.params.filename;

    // Only allow filenames created by our upload system.
    if (
        typeof filename !== "string" ||
        !/^\d+-[a-zA-Z0-9._-]+\.pdf$/i.test(filename)
    ) {
        return res.status(400).json({
            status: "error",
            message: "Invalid PDF filename."
        });
    }

    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            status: "error",
            message: "PDF file not found."
        });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}"`
    );

    res.sendFile(filePath);
});


module.exports = router;

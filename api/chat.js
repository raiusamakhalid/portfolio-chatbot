require("dotenv").config();

const askQuestion = require("../services/rag");
const { setCorsHeaders } = require("../config/cors");

/**
 * Dedicated Vercel serverless handler for /chat.
 * Handles CORS + OPTIONS before auth so preflight never returns 401/403.
 */
module.exports = async (req, res) => {
    setCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const key = req.headers["x-api-key"];
    if (!key || key !== process.env.API_SECRET_KEY) {
        return res.status(403).json({ error: "Forbidden: invalid or missing API key" });
    }

    try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

        await askQuestion(body.question, (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });

        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.error(err);
        if (!res.headersSent) {
            res.status(500).json({ error: "Server error" });
        }
    }
};

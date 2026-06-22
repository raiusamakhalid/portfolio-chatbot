const express = require("express");
const cors = require("cors");
require("dotenv").config();
const askQuestion = require("./services/rag");
const authGuard = require("./guards/authGuard");
const syncIfChanged = require("./services/cvSync");

const app = express();

app.use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type', 'x-api-key'],
}));
app.use(express.json());

app.get("/", (req, res) => res.json({ status: "ok" }));

app.post("/chat", authGuard, async (req, res) => {
    try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        await askQuestion(req.body.question, (chunk) => {
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        });

        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
});

if (require.main === module) {
    syncIfChanged()
        .then(() => app.listen(5000, () => console.log("Server running on 5000")))
        .catch(console.error);
} else {
    module.exports = app;
}

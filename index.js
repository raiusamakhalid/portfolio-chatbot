const express = require("express");
const cors = require("cors");
require("dotenv").config();
const askQuestion = require("./services/rag");
const authGuard = require("./guards/authGuard");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/chat", authGuard, async (req, res) => {
    try {
        const answer = await askQuestion(req.body.question);
        res.json({ answer });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.listen(5000, () => {
    console.log("Server running on 5000");
});
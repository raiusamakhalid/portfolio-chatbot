const express = require("express");

const router = express.Router();

const askQuestion = require("../services/rag");

router.post("/", async (req, res) => {

    try {

        const answer = await askQuestion(
            req.body.question
        );

        res.json({
            answer
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Error"
        });
    }

});

module.exports = router;
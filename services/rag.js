const { Pinecone } = require("@pinecone-database/pinecone");
const { ChatGroq } = require("@langchain/groq");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buildPortfolioPrompt } = require("./prompt");

require("dotenv").config();

// Gemini — used to convert text into embedding vectors for Pinecone similarity search
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Groq — used to generate the final streamed answer
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const llm = new ChatGroq({ model: "llama-3.3-70b-versatile" });

// Fixed retrieval queries — always fetched alongside the user's question
// so profile and contact info are available even when the question is vague
const CONTACT_QUERY = "email address phone number linkedin profile contact information";
const PROFILE_QUERY = "full name professional title summary about me";

/** Embed a string into a vector using Gemini. */
async function embedText(text) {
    const result = await embedModel.embedContent(text);
    return result.embedding.values;
}

/**
 * Retrieve relevant CV chunks from Pinecone and stream an LLM answer.
 * @param {string} question - User's message
 * @param {(chunk: string) => void} [onChunk] - Optional callback for each streamed token
 */
async function askQuestion(question, onChunk) {
    const index = pinecone.Index(process.env.PINECONE_INDEX);

    // Embed all three queries in parallel before hitting Pinecone
    const [questionVector, profileVector, contactVector] = await Promise.all([
        embedText(question),
        embedText(PROFILE_QUERY),
        embedText(CONTACT_QUERY),
    ]);

    // Query Pinecone with each vector — question gets more chunks, profile/contact get fewer
    const [questionResult, profileResult, contactResult] = await Promise.all([
        index.query({ vector: questionVector, topK: 4, includeMetadata: true }),
        index.query({ vector: profileVector, topK: 1, includeMetadata: true }),
        index.query({ vector: contactVector, topK: 2, includeMetadata: true }),
    ]);

    // Combine results and drop duplicate chunks (same text from overlapping queries)
    const seen = new Set();
    const allMatches = [...questionResult.matches, ...profileResult.matches, ...contactResult.matches].filter(m => {
        if (seen.has(m.metadata.text)) return false;
        seen.add(m.metadata.text);
        return true;
    });

    const context = allMatches.map(m => m.metadata.text).join("\n");

    const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const prompt = buildPortfolioPrompt({ context, question, today });

    const stream = await llm.stream(prompt);

    let fullResponse = "";
    for await (const chunk of stream) {
        const text = chunk.content;
        fullResponse += text;
        if (onChunk) onChunk(text);
    }

    return fullResponse;
}

module.exports = askQuestion;

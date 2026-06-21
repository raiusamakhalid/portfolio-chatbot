const { Pinecone } = require("@pinecone-database/pinecone");
const { ChatGroq } = require("@langchain/groq");
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function askQuestion(question) {

    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pinecone.Index(process.env.PINECONE_INDEX);

    // 1. Convert question to vector
    const embedResult = await embedModel.embedContent(question);
    const queryVector = embedResult.embedding.values;

    // 2. Search Pinecone
    const result = await index.query({
        vector: queryVector,
        topK: 3,
        includeMetadata: true
    });

    const context = result.matches
        .map(m => m.metadata.text)
        .join("\n");

    // 3. LLM
    const llm = new ChatGroq({ model: "llama-3.3-70b-versatile" });

    const prompt = `
You are AI assistant of Usama Khalid.

Use only this context:

${context}

Question: ${question}

If answer not in context, say "I don't know".
`;

    const response = await llm.invoke(prompt);

    return response.content;
}

module.exports = askQuestion;

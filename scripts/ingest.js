const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

const { Pinecone } = require("@pinecone-database/pinecone");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");

require("dotenv").config();

const CV_PATH = path.join(__dirname, "../data/cv.pdf");

async function ingest() {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

    const existingIndexes = await pinecone.listIndexes();
    const indexNames = existingIndexes.indexes?.map(i => i.name) || [];
    if (!indexNames.includes(process.env.PINECONE_INDEX)) {
        console.log("Creating Pinecone index...");
        await pinecone.createIndex({
            name: process.env.PINECONE_INDEX,
            dimension: 3072,
            metric: "cosine",
            spec: { serverless: { cloud: "aws", region: "us-east-1" } }
        });
        console.log("Index created. Waiting for it to be ready...");
        await new Promise(r => setTimeout(r, 60000));
    }

    const index = pinecone.Index(process.env.PINECONE_INDEX);

    // Clear existing vectors so stale chunks don't linger after CV updates
    console.log("Clearing existing vectors...");
    await index.deleteAll();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

    const dataBuffer = fs.readFileSync(CV_PATH);
    const data = await pdf(dataBuffer);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([data.text]);

    for (let i = 0; i < chunks.length; i++) {
        const result = await embedModel.embedContent(chunks[i].pageContent);
        const vector = result.embedding.values;

        await index.upsert({
            records: [{
                id: `chunk-${i}`,
                values: vector,
                metadata: { text: chunks[i].pageContent },
            }]
        });

        console.log(`Uploaded chunk ${i + 1}/${chunks.length}`);
    }

    console.log("CV uploaded to Pinecone!");
}

// Allow direct run: node scripts/ingest.js
if (require.main === module) {
    ingest().catch(console.error);
}

module.exports = ingest;

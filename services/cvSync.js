const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ingest = require("../scripts/ingest");

const CV_PATH = path.join(__dirname, "../data/cv.pdf");
const HASH_PATH = path.join(__dirname, "../data/.cv-hash");

function computeHash() {
    const buffer = fs.readFileSync(CV_PATH);
    return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function syncIfChanged() {
    if (!fs.existsSync(CV_PATH)) {
        console.warn("cv.pdf not found — skipping Pinecone sync.");
        return;
    }

    const currentHash = computeHash();
    const storedHash = fs.existsSync(HASH_PATH)
        ? fs.readFileSync(HASH_PATH, "utf8").trim()
        : null;

    if (currentHash === storedHash) {
        console.log("CV unchanged — Pinecone is up to date.");
        return;
    }

    console.log(storedHash ? "CV changed — re-seeding Pinecone..." : "First run — seeding Pinecone...");
    await ingest();
    fs.writeFileSync(HASH_PATH, currentHash, "utf8");
    console.log("Pinecone sync complete.");
}

module.exports = syncIfChanged;

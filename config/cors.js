const defaultOrigins = [
    "https://usamakhalid.dev",
    "https://www.usamakhalid.dev",
    "http://localhost:3000",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : defaultOrigins;

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
    optionsSuccessStatus: 204,
};

/** Set CORS headers manually — used by Vercel serverless handlers. */
function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");
    res.setHeader("Access-Control-Max-Age", "86400");
}

module.exports = { corsOptions, setCorsHeaders };

require("dotenv").config();

function authGuard(req, res, next) {
    if (req.method === 'OPTIONS') return next();

    const key = req.headers["x-api-key"];
    if (!key || key !== process.env.API_SECRET_KEY) {
        return res.status(403).json({ error: "Forbidden: invalid or missing API key" });
    }

    next();
}

module.exports = authGuard;

// QuizBee frontend/API share a site. Production cookies require HTTPS;
// local development uses HTTP, while both modes keep cookies inaccessible to scripts.
module.exports = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" });

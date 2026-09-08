const jwt = require("jsonwebtoken")

require('dotenv').config({
}) //configure your env and enter approraite path

const authMiddleware = (req, res, next) => {
  const token = req.cookies?.token
  if (!token) {
    return res.status(403).json({
      message: "Unauthorized"
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ 
        message: "Invalid token" 
    })
  }
}

module.exports = authMiddleware

module.exports.requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) return res.status(403).json({ message: "Forbidden" });
  next();
};

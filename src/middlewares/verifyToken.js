import axios from "axios";
import redis from "../utils/redis.util.js";
import { authServiceUrl } from "../config/app.config.js";

export async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const cached = await redis.get(`auth:${token}`);
    if (cached) {
      req.user = JSON.parse(cached);
      return next();
    }

    const response = await axios.get(`${authServiceUrl}/users/current`, {
      headers: { Authorization: authHeader },
      timeout: 5000,
    });

    const user = response.data;
    await redis.set(`auth:${token}`, JSON.stringify(user), "EX", 300);
    req.user = user;
    next();
  } catch (err) {
    console.error("Auth verification failed:", err.response?.data || err.message);
    const status = err.response?.status || 401;
    const message = err.response?.data?.error || "Invalid or expired token";
    return res.status(status).json({ error: message });
  }
}

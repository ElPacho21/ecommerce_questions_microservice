import Redis from "ioredis";
import { redisUrl } from "../config/app.config.js";

const redis = new Redis(redisUrl);

redis.on("connect", () => console.log("Redis conectado..."));
redis.on("error", (err) => console.error("Redis error:", err.message));

export default redis;
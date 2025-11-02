import dotenv from 'dotenv';

dotenv.config()

export const port = process.env.PORT;
export const mongoUri = process.env.MONGO_URI;
export const authServiceUrl = process.env.AUTH_SERVICE_URL;
export const catalogServiceUrl = process.env.CATALOG_SERVICE_URL;
export const rabbitUrl = process.env.RABBIT_URL;
export const redisUrl = process.env.REDIS_URL;
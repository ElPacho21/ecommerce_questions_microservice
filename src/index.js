import express from "express";
import morgan from "morgan";
import cors from "cors";

import mongoConnect from "../db/index.js";
import router from "./routes/index.js";
import { port } from './config/app.config.js';
import { consumeTokenInvalidation } from "./consumers/auth.consumer.js";
import { consumeArticleDeleted } from "./consumers/catalog.consumer.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { swaggerUi, swaggerSpec } from "./config/swagger.config.js";
import { connectRabbit } from "./utils/rabbit.util.js";

const app = express();

// Morgan
app.use(morgan('dev'));

// Middleware para permitir cross-origin
app.use(cors({ 
    origin: "*",
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Base de Datos
mongoConnect();

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
router(app);

// Manejador de errores
app.use(errorHandler);


// Consumers de RabbitMQ
consumeTokenInvalidation();
consumeArticleDeleted();

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import morgan from "morgan";
import cors from "cors";

import mongoConnect from "../db/index.js";
import router from "./routes/index.js";
import { port } from './config/app.config.js';
import { consumeTokenInvalidation } from "./consumers/auth.consumer.js";
import { consumeArticleDeleted } from "./consumers/catalog.consumer.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { swaggerUi, swaggerSpec } from "./config/swagger.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
app.use(express.static(__dirname + '/public'));

// Base de Datos
mongoConnect();

// Swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas
router(app);

// Manejador de errores
app.use(errorHandler);


// Suscriptores de RabbitMQ
consumeTokenInvalidation();
consumeArticleDeleted();

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
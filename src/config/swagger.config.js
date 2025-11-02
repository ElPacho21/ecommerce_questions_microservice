import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Questions API",
      version: "1.0.0",
      description: "Documentación de la API de preguntas y respuestas y eventos de estadísticas (RabbitMQ)",
    },
    servers: [
      {
        url: "http://localhost:3005"
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Question: {
          type: "object",
          properties: {
            _id: { type: "string", example: "670fd0f6f2d3a8a1b3c9e712" },
            articleId: { type: "string", example: "ART-123" },
            userId: { type: "string", example: "USR-456" },
            question: { type: "string", example: "¿Este producto incluye garantía?" },
            answer: { type: ["string", "null"], example: "Sí, 12 meses de garantía." },
            answeredBy: { type: ["string", "null"], example: "ADMIN-999" },
            answeredAt: { type: ["string", "null"], format: "date-time", example: "2025-11-02T18:25:43.511Z" },
            createdAt: { type: "string", format: "date-time", example: "2025-11-01T10:00:00.000Z" },
            enabled: { type: "boolean", example: true },
          },
          required: ["articleId", "userId", "question"],
        },
        NewQuestion: {
          type: "object",
          properties: {
            articleId: { type: "string", example: "ART-123" },
            question: { type: "string", example: "¿Tiene envío gratis?" },
          },
          required: ["articleId", "question"],
        },
        AnswerRequest: {
          type: "object",
          properties: {
            answer: { type: "string", example: "Sí, a partir de $50." },
          },
          required: ["answer"],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
        // Eventos del exchange "stats"
        StatsEvent: {
          type: "object",
          description: "Evento publicado en el exchange 'stats'",
          properties: {
            eventType: {
              type: "string",
              description: "Tipo de evento publicado",
              enum: ["question_created", "question_answered"],
            },
            articleId: { type: "string", example: "ART-123" },
            userId: { type: "string", example: "USR-456" },
            timestamp: { type: "string", format: "date-time", example: "2025-11-02T18:25:43.511Z" },
          },
          required: ["eventType", "articleId", "userId", "timestamp"],
        },
        StatsQuestionCreatedEvent: {
          allOf: [
            { $ref: "#/components/schemas/StatsEvent" },
            {
              type: "object",
              properties: {
                eventType: { type: "string", enum: ["question_created"] },
              },
            },
          ],
        },
        StatsQuestionAnsweredEvent: {
          allOf: [
            { $ref: "#/components/schemas/StatsEvent" },
            {
              type: "object",
              properties: {
                eventType: { type: "string", enum: ["question_answered"] },
              },
            },
          ],
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ["./src/controllers/*.js"]
};

export const swaggerSpec = swaggerJSDoc(options);
export { swaggerUi };
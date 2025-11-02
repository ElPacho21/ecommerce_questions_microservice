# Questions Microservice (Q&A)

Microservicio de Preguntas y Respuestas para un e‑commerce. Gestiona las preguntas de usuarios sobre artículos del catálogo y permite a administradores responderlas. Se integra con:

- Auth Microservice: verificación de usuarios y validación de tokens.
- Catalog Microservice: validación de artículos.
- Stats Microservice: recibe eventos publicados por este servicio (RabbitMQ exchange `stats`).

Exposición de API REST con Express + MongoDB (Mongoose), caché de autenticación con Redis y mensajería con RabbitMQ. La documentación OpenAPI/Swagger está disponible en `/api-docs`.

---

## Requisitos

- Node.js 18+ (ESM)
- MongoDB 6+
- RabbitMQ 3+
- Redis 6+

---

## Configuración (variables de entorno)

Crear un archivo `.env` en la raíz del proyecto:

```
PORT=3005
MONGO_URI=mongodb://localhost:27017/ecommerce_questions
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3002
RABBIT_URL=amqp://localhost
REDIS_URL=redis://localhost:6379
```

Descripción rápida:
- `PORT`: Puerto HTTP del microservicio.
- `MONGO_URI`: Cadena de conexión de MongoDB.
- `AUTH_SERVICE_URL`: URL base del microservicio de autenticación (se usa para `/users/current`).
- `CATALOG_SERVICE_URL`: URL base del microservicio de catálogo (se usa para validar artículos).
- `RABBIT_URL`: Cadena de conexión a RabbitMQ.
- `REDIS_URL`: Cadena de conexión a Redis.

---

## Instalación y ejecución

```powershell
# Instalar dependencias
npm install

# Desarrollo con recarga
npm run dev

# Producción
npm start
```

Una vez iniciado, visita la documentación en:

- Swagger UI: http://localhost:3005/api-docs

---

## Arquitectura

- `Express` para exponer endpoints REST.
- `Mongoose` para persistencia en MongoDB.
- `Redis` (ioredis) para caché de autenticación (perfil de usuario por token).
- `RabbitMQ` para integración asíncrona:
  - Publicación de eventos de estadísticas en exchange `stats`.
  - Consumo de eventos de `auth` (invalidación de tokens).
  - Consumo de eventos de `article_deleted` (eliminación lógica de preguntas por artículo).

---

## Autenticación y Autorización

- Todos los endpoints de `/questions` pasan por `verifyToken` (lectura del usuario actual vía Auth y caché en Redis). Se espera `Authorization: Bearer <JWT>`.
- Autorización por rol:
  - `user`: crear/listar/consultar preguntas.
  - `admin`: responder preguntas, eliminar respuestas y deshabilitar preguntas.

---

## Endpoints principales

Base path: `/questions`

- GET `/questions` (user)
  - Lista todas las preguntas habilitadas.
- GET `/questions/me` (user)
  - Lista todas las preguntas del usuario actual.
- GET `/questions/user/{userId}` (user/admin)
  - Lista preguntas de un usuario específico. Si no sos admin, solo podés consultar tus propias preguntas.
- GET `/questions/article/{articleId}` (user)
  - Lista preguntas de un artículo válido y habilitado en el microservicio de catálogo.
- GET `/questions/stats`
  - Devuelve estadísticas agregadas de preguntas y respuestas.
- GET `/questions/{id}` (user)
  - Devuelve una pregunta por su ID.
- POST `/questions` (user)
  - Crea una nueva pregunta para un artículo. Publica evento `question_created`.
  - Body: `{ "articleId": "ART-123", "question": "¿Tiene garantía?" }`
- PATCH `/questions/{id}/answer` (admin)
  - Responde una pregunta. Publica evento `question_answered`.
  - Body: `{ "answer": "Sí, 12 meses." }`
- DELETE `/questions/{id}/answer` (admin)
  - Elimina la respuesta de una pregunta.
- DELETE `/questions/{id}` (admin)
  - Deshabilita lógicamente una pregunta.

Para detalles completos y ejemplos de respuesta, consultar Swagger en `/api-docs`.

---

## Casos de uso principales

1. Un usuario autenticado pregunta sobre un artículo existente y habilitado.
   - Se valida el artículo con Catalog; si no existe o está deshabilitado, devuelve 404.
   - Se almacena la pregunta en MongoDB y se publica `question_created` a `stats`.

2. Un administrador responde una pregunta pendiente.
   - Se actualiza la pregunta con `answer`, `answeredBy`, `answeredAt` y se publica `question_answered` a `stats`.

3. Un administrador quita una respuesta errónea o desactualizada.
   - Se pone `answer`, `answeredBy`, `answeredAt` a `null`.

4. Un usuario o administrador deshabilita una pregunta.
   - Soft delete: no se elimina físicamente.

---

## Integración con otros Microservicios

1. Consulta rápida de preguntas y estadísticas agregadas.
   - Listados por artículo, detalle por ID y métricas globales en `/questions/stats`.

2. Integridad con eventos externos.
   - Si Catalog emite `article_deleted`, este servicio deshabilita todas las preguntas del artículo.
   - Si Auth emite invalidación de token, este servicio purga el caché de ese token en Redis.


## Eventos publicados a Stats (RabbitMQ)

Este servicio publica eventos en el exchange `stats`. Los servicios interesados (p.ej., Stats Microservice) deben crear una cola propia y enlazarla a este exchange.

- Exchange: `stats`
- Tipo: `fanout`
- Payload general (`StatsEvent`):

```json
{
  "eventType": "question_created | question_answered",
  "articleId": "ART-123",
  "userId": "USR-456",
  "timestamp": "2025-11-02T18:25:43.511Z"
}
```

Eventos emitidos:
- `question_created` (al crear una pregunta)
- `question_answered` (al responder una pregunta)

---

## Eventos consumidos

1) Auth: invalidación de tokens
- Exchange: `auth`
- Comportamiento: elimina la entrada `auth:<token>` de Redis.

2) Catalog: artículo eliminado
- Exchange: `article_deleted`
- Payload esperado mínimo: `{ "articleId": "ART-123" }`
- Comportamiento: deshabilita todas las preguntas con ese `articleId`.

---

## Endpoint de estadísticas

- GET `/questions/stats`
- Respuesta (ejemplo):

```json
{
  "totalQuestions": 120,
  "totalAnswers": 80,
  "activeQuestions": 110,
  "disabledQuestions": 10,
  "mostAskedArticleId": "ART-123",
  "byArticle": [
    { "_id": "ART-123", "total": 40 },
    { "_id": "ART-456", "total": 30 }
  ]
}
```
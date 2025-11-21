# Questions Microservice (Q&A)

Microservicio de Preguntas y Respuestas para un e‑commerce. Gestiona las preguntas de usuarios sobre artículos del catálogo y permite a administradores responderlas. Se integra con:

- Auth Microservice: verificación de usuarios y validación de tokens.
- Catalog Microservice: validación de artículos.
- Stats Microservice: recibe eventos publicados por este servicio (RabbitMQ exchange `stats`).

Exposición de API REST con Express + MongoDB (Mongoose), caché de autenticación con Redis y mensajería con RabbitMQ. La documentación OpenAPI/Swagger está disponible en `/api-docs`.

---

## Repositorios relacionados

- **Catalog Microservice (Go):** [https://github.com/ElPacho21/catalog_modified](https://github.com/ElPacho21/catalog_modified)
  
- **Cliente React:** [https://github.com/ElPacho21/client_react_modified](https://github.com/ElPacho21/client_react_modified)

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
- PATCH `/questions/{id}` (user)
  - Actualiza el texto de una pregunta. Solo el autor puede editarla.
  - Body: `{ "question": "¿Tiene garantía extendida?" }`
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

### CU-01: Crear una pregunta sobre un artículo

**Actor:** Usuario autenticado

**Flujo principal:**
1. POST a `/questions` con `{ "articleId": "ART-123", "question": "¿Tiene garantía?" }` y token Bearer.
2. Validación de token contra Auth (cache Redis 5 min).
3. Verificación de existencia y estado del artículo en Catalog: `GET /articles/{articleId}`.
4. Creación del documento en MongoDB: `{ articleId, question, userId, createdAt, enabled: true }`.
5. Publicación de evento a RabbitMQ exchange `stats`: `{ eventType: "question_created", articleId, userId, timestamp }`.
6. Retorna pregunta creada (201).

**Excepciones:**
- Falta `articleId` o `question`: 400
- Token inválido: 401
- Artículo no existe o deshabilitado: 404

---

### CU-02: Consultar preguntas de un artículo

**Actor:** Usuario autenticado

**Flujo principal:**
1. GET a `/questions/article/{articleId}` con token.
2. Verificación de artículo en Catalog: `GET /articles/{articleId}`.
3. Query MongoDB: `find({ articleId, enabled: true })`.
4. Retorna array de preguntas (200).

**Excepciones:**
- Artículo no existe o deshabilitado: 404

---

### CU-03: Actualizar el texto de una pregunta propia

**Actor:** Usuario autenticado (autor)

**Flujo principal:**
1. PATCH a `/questions/{id}` con `{ "question": "Texto actualizado" }` y token.
2. Búsqueda en MongoDB: `findOne({ _id: id, enabled: true })`.
3. Validación: `question.userId == user.id`.
4. Actualización: `findByIdAndUpdate(id, { question }, { new: true })`.
5. Retorna pregunta actualizada (200).

**Excepciones:**
- Campo vacío: 400
- Pregunta no existe: 404
- Usuario no es autor: 403

---

### CU-04: Responder una pregunta

**Actor:** Administrador

**Flujo principal:**
1. PATCH a `/questions/{id}/answer` con `{ "answer": "Texto respuesta" }` y token admin.
2. Búsqueda en MongoDB: `findOne({ _id: id, enabled: true })`.
3. Actualización: `findByIdAndUpdate(id, { answer, answeredBy, answeredAt }, { new: true })`.
4. Publicación a exchange `stats`: `{ eventType: "question_answered", articleId, userId, timestamp }`.
5. Retorna pregunta con respuesta (200).

**Excepciones:**
- Campo vacío: 400
- No es admin: 403
- Pregunta no existe: 404

---

### CU-05: Eliminar una respuesta

**Actor:** Administrador (autor de la respuesta)

**Flujo principal:**
1. DELETE a `/questions/{id}/answer` con token admin.
2. Búsqueda y validación: `question.answeredBy == userId`.
3. Actualización: `findByIdAndUpdate(id, { answer: null, answeredBy: null, answeredAt: null }, { new: true })`.
4. Retorna pregunta sin respuesta (200).

**Excepciones:**
- Pregunta no existe: 404
- Admin no es autor de la respuesta: 403

---

### CU-06: Deshabilitar una pregunta

**Actor:** Usuario (autor) o Administrador

**Flujo principal:**
1. DELETE a `/questions/{id}` con token.
2. Búsqueda en MongoDB: `findOne({ _id: id, enabled: true })`.
3. Validación: `userId == question.userId OR user.permissions.includes("admin")`.
4. Soft delete: `question.enabled = false; question.save()`.
5. Retorna pregunta deshabilitada (200).

**Excepciones:**
- Pregunta no existe: 404
- Usuario no autorizado: 403

---

### CU-07: Obtener preguntas de un usuario

**Actor:** Usuario (propias) o Administrador (cualquiera)

**Flujo principal:**
1. GET a `/questions/user/{userId}` con token.
2. Validación: si no es admin, `userId == user.id`.
3. Query MongoDB: `find({ userId, enabled: true })`.
4. Retorna array de preguntas (200).

**Excepciones:**
- Usuario intenta ver preguntas de otro: 403

---

### CU-08: Obtener estadísticas globales

**Actor:** Cliente autenticado

**Flujo principal:**
1. GET a `/questions/stats` con token.
2. Ejecución de agregaciones MongoDB:
   - `countDocuments({})` → totalQuestions
   - `countDocuments({ enabled: true })` → activeQuestions
   - `countDocuments({ answer: { $ne: null } })` → totalAnswers
   - Pipeline: `$group` por articleId, `$sort`, `$limit: 1` → mostAskedArticleId
   - Pipeline: `$group` por articleId → byArticle
3. Retorna objeto con estadísticas (200).

---

### CU-09: Invalidación de caché por evento Auth

**Actor:** Sistema (RabbitMQ consumer)

**Flujo principal:**
1. Recepción de evento desde exchange `auth`: `{ message: "Bearer <token>" }`.
2. Extracción del token y eliminación de Redis: `DEL auth:<token>`.
3. Log de confirmación.

**Resultado:** Token eliminado del caché, próximas peticiones revalidan contra Auth.

---

### CU-10: Deshabilitación de preguntas por eliminación de artículo

**Actor:** Sistema (RabbitMQ consumer)

**Flujo principal:**
1. Recepción de evento desde exchange `article_deleted`: `{ articleId: "ART-123" }`.
2. Actualización masiva: `updateMany({ articleId }, { $set: { enabled: false } })`.
3. Log de confirmación.

**Resultado:** Todas las preguntas del artículo quedan deshabilitadas (soft delete).

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
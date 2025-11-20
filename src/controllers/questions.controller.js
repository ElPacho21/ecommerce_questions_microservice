import { Router } from "express";
import { authorize } from "../middlewares/authorize.js";
import * as questionService from "../services/questions.service.js";

/**
 * @swagger
 * tags:
 *   - name: Questions
 *     description: Gestión de preguntas y respuestas de artículos
 *
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Token inválido o ausente
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     ForbiddenError:
 *       description: No autorizado para realizar esta acción
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

const router = Router();

// Obtener todas las preguntas
/**
 * @swagger
 * /questions:
 *   get:
 *     summary: Obtener todas las preguntas habilitadas
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de preguntas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/", authorize(["user"]), async (req, res, next) => {
  try {
    const questions = await questionService.getAllQuestions();
    res.status(200).json(questions);
  } catch (err) {
    next(err);
  }
});

// Obtener preguntas del usuario actual
/**
 * @swagger
 * /questions/me:
 *   get:
 *     summary: Obtener todas las preguntas del usuario actual
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de preguntas del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/me", authorize(["user"]), async (req, res, next) => {
  try {
    const user = req.user;
    const questions = await questionService.getQuestionsByUser({ userId: user.id, user });
    res.status(200).json(questions);
  } catch (err) {
    next(err);
  }
});

// Obtener preguntas por usuario
/**
 * @swagger
 * /questions/user/{userId}:
 *   get:
 *     summary: Obtener todas las preguntas creadas por un usuario
 *     description: Un usuario solo puede ver sus propias preguntas. Los administradores pueden consultar cualquier usuario.
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del usuario
 *     responses:
 *       200:
 *         description: Lista de preguntas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
router.get("/user/:userId", authorize(["user", "admin"]), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = req.user;
    const questions = await questionService.getQuestionsByUser({ userId, user });
    res.status(200).json(questions);
  } catch (err) {
    next(err);
  }
});


// Obtener preguntas por articulo
/**
 * @swagger
 * /questions/article/{articleId}:
 *   get:
 *     summary: Obtener preguntas por artículo
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del artículo
 *     responses:
 *       200:
 *         description: Preguntas del artículo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Artículo no encontrado o deshabilitado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/article/:articleId", authorize(["user"]), async (req, res, next) => {
  try {
    const { articleId } = req.params;
    const token = req.headers.authorization?.split(" ")[1];
    const questions = await questionService.getQuestionsByArticle(articleId, token);
    res.status(200).json(questions);
  } catch (err) {
    next(err);
  }
});

// Obtener estadísticas de preguntas
/**
 * @swagger
 * /questions/stats:
 *   get:
 *     summary: Obtener estadísticas globales de preguntas y respuestas
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de estadísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalQuestions:
 *                   type: integer
 *                   example: 120
 *                 totalAnswers:
 *                   type: integer
 *                   example: 80
 *                 activeQuestions:
 *                   type: integer
 *                   example: 110
 *                 disabledQuestions:
 *                   type: integer
 *                   example: 10
 *                 mostAskedArticleId:
 *                   type: ["string", "null"]
 *                   example: "ART-123"
 *                 byArticle:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       total:
 *                         type: integer
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await questionService.getStatistics();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
});


// Obtener una pregunta por ID
/**
 * @swagger
 * /questions/{id}:
 *   get:
 *     summary: Obtener una pregunta por su ID
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pregunta encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Pregunta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id", authorize(["user"]), async (req, res, next) => {
  try{
    const { id } = req.params;
    const question = await questionService.getQuestionById(id);

    res.status(200).json(question);
  } catch (err) {
    next(err);
  }
});

// Crear una nueva pregunta
/**
 * @swagger
 * /questions:
 *   post:
 *     summary: Crear una nueva pregunta para un artículo
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewQuestion'
 *     responses:
 *       201:
 *         description: Pregunta creada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Artículo no encontrado o deshabilitado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     description: |
 *       Evento publicado en exchange 'stats':
 *       - StatsQuestionCreatedEvent
 */
router.post("/", authorize(["user"]), async (req, res, next) => {
  try {
    const { articleId, question } = req.body;
    const user = req.user;

    if (!articleId || !question) {
      return res.status(400).json({ error: "articleId and question are required" });
    }
    const token = req.headers.authorization?.split(" ")[1];
    const newQuestion = await questionService.createQuestion({
      articleId,
      question,
      user,
      token,
    });
    res.status(201).json(newQuestion);
  } catch (err) {
    next(err);
  }
});

// Responder una pregunta
/**
 * @swagger
 * /questions/{id}/answer:
 *   patch:
 *     summary: Responder una pregunta (solo admin)
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnswerRequest'
 *     responses:
 *       200:
 *         description: Pregunta respondida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: La respuesta no puede estar vacía
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Pregunta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *     description: |
 *       Evento publicado en exchange 'stats':
 *       - StatsQuestionAnsweredEvent
 */
router.patch("/:id/answer", authorize(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;
    const answeredBy = req.user.id;

    if (!answer) return res.status(400).json({ error: "The answer cannot be empty." });

    const questionAnswered = await questionService.answerQuestion({
      id,
      answer,
      userId: answeredBy
    });

    if (!questionAnswered) return res.status(404).json({ error: "Question not found" });

    res.status(200).json(questionAnswered);
  } catch (err) {
    next(err);
  }
});

// Actualizar una pregunta
/**
 * @swagger
 * /questions/{id}:
 *   patch:
 *     summary: Actualizar el texto de una pregunta (solo el autor)
 *     description: Permite al usuario que creó la pregunta modificar su texto. Los administradores no pueden editar preguntas de otros usuarios.
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la pregunta a actualizar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 example: "¿Este producto tiene garantía extendida?"
 *             required:
 *               - question
 *     responses:
 *       200:
 *         description: Pregunta actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: El campo question no puede estar vacío
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Solo el autor de la pregunta puede editarla
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Pregunta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch("/:id", authorize(["user"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    const user = req.user;

    if (!question) return res.status(400).json({ error: "The question cannot be empty." });
    
    const updatedQuestion = await questionService.updateQuestion(id, question, user);

    if (!updatedQuestion) return res.status(404).json({ error: "Question not found" });
    
    res.status(200).json(updatedQuestion);
  } catch (err) {
    next(err);
  }
});

// Eliminar una respuesta
/**
 * @swagger
 * /questions/{id}/answer:
 *   delete:
 *     summary: Eliminar la respuesta de una pregunta (solo admin)
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Respuesta eliminada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Pregunta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id/answer", authorize(["admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const deleted = await questionService.deleteAnswer(id, userId);
    
    res.status(200).json(deleted);
  } catch (error) {
    next(error);
  }
});

// Eliminar una pregunta
/**
 * @swagger
 * /questions/{id}:
 *   delete:
 *     summary: Deshabilitar una pregunta
 *     description: Marcado lógico de la pregunta como no habilitada
 *     tags: [Questions]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Pregunta deshabilitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Pregunta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete("/:id", authorize(["user", "admin"]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const deleted = await questionService.deleteQuestion(id, user);

    res.status(200).json(deleted);
  } catch (err) {
    next(err);
  }
});

export default router;
import { QuestionDao } from "../dao/questions.dao.js";
import { publishEvent } from "../utils/rabbit.util.js";
import axios from "axios";
import { catalogServiceUrl } from "../config/app.config.js";

const questionDao = new QuestionDao();

export async function getAllQuestions() {
  return await questionDao.findAll();
}

export async function getQuestionsByUser({ userId, user }) {
  const isAdmin = Array.isArray(user.permissions) && user.permissions.includes("admin");

  if (!isAdmin && user?.id?.toString() !== userId?.toString()) {
    const err = new Error("You are not authorized to see other user's questions");
    err.statusCode = 403;
    throw err;
  }

  return await questionDao.findForUserId(userId);
}

export async function getQuestionsByArticle(articleId, token) {
  const article = await axios.get(`${catalogServiceUrl}/articles/${articleId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!article.data || article.data.enabled === false) {
    const err = new Error("Article not found or disabled");
    err.statusCode = 404;
    throw err;
  }
  return await questionDao.findForArticleId(articleId);
}

export async function getQuestionById(id) {
  const question = await questionDao.findById(id);
  if (!question) {
    const err = new Error("Question not found");
    err.statusCode = 404;
    throw err;
  }
  return question;
}

export async function createQuestion({ articleId, question, user, token }) {
  const article = await axios.get(`${catalogServiceUrl}/articles/${articleId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!article.data || article.data.enabled === false) {
    const err = new Error("Article not found or disabled");
    err.statusCode = 404;
    throw err;
  }

  const newQuestion = await questionDao.insertOne({
    articleId,
    questionText: question,
    userId: user.id,
    createdAt: new Date(),
  });

  await publishEvent("stats", {
    eventType: "question_created",
    articleId,
    userId: user.id,
    timestamp: new Date().toISOString(),
  });

  return newQuestion;
}

export async function deleteAnswer(id, userId) {
  const question = await questionDao.findById(id);
  if (!question) {
    const err = new Error("Question not found");
    err.statusCode = 404;
    throw err;
  }
  if (question.answeredBy.toString() !== userId.toString()) {
    const err = new Error("You are not authorized to delete this answer");
    err.statusCode = 403;
    throw err;
  }

  const updatedQuestion = {
    answer: null,
    answeredBy: null,
    answeredAt: null,
  };

  return await questionDao.updateById(id, updatedQuestion);
}

export async function deleteQuestion(id, user) {
  const question = await questionDao.findById(id);
  if (!question) {
    const err = new Error("Question not found");
    err.statusCode = 404;
    throw err;
  }

  const isAuthor = question.userId.toString() === user.id.toString();
  const hasAdminPermission = Array.isArray(user.permissions) && user.permissions.includes("admin");

  if (!isAuthor && !hasAdminPermission) {
    const err = new Error("You are not authorized to delete this question");
    err.statusCode = 403;
    throw err;
  }

  question.enabled = false;
  await question.save();

  return question;
}

export async function updateQuestion(id, question, user) {
  const questionExisting = await questionDao.findById(id);

  if (!questionExisting) {
    const err = new Error("Question not found");
    err.statusCode = 404;
    throw err;
  }

  if (questionExisting.userId.toString() !== user.id.toString()) {
    const err = new Error("You are not authorized to update this question");
    err.statusCode = 403;
    throw err;
  }
  
  const updatedQuestion = await questionDao.updateById(id, { question });

  return updatedQuestion;
}

export async function answerQuestion({ id, answer, userId }) {
  const updated = {
    answer,
    answeredBy: userId,
    answeredAt: new Date(),
  };

  const question = await questionDao.findById(id);

  if (!question) {
    const err = new Error("Question not found");
    err.statusCode = 404;
    throw err;
  }

  const questionAnswered = await questionDao.updateById(id, updated);

  await publishEvent("stats", {
    eventType: "question_answered",
    articleId: question.articleId,
    userId,
    timestamp: new Date().toISOString(),
  });

  return questionAnswered;
}

export async function getStatistics() {
  const totalQuestions = await questionDao.countQuestions({});
  const activeQuestions = await questionDao.countQuestions({ enabled: true });
  const disabledQuestions = totalQuestions - activeQuestions;

  const totalAnswers = await questionDao.countQuestions({ answer: { $ne: null } });

  const mostAsked = await questionDao.aggregate([
    { $group: { _id: "$articleId", total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 1 }
  ]);

  const mostAskedArticleId = mostAsked.length > 0 ? mostAsked[0]._id : null;

  const byArticle = await questionDao.aggregate([
    { $group: { _id: "$articleId", total: { $sum: 1 } } }
  ]);

  return { totalQuestions, totalAnswers, activeQuestions, disabledQuestions, mostAskedArticleId, byArticle };
}

export async function deleteByArticleId(articleId) {
  return await questionDao.updateMany(
    { articleId },
    { $set: { enabled: false } }
  );
}
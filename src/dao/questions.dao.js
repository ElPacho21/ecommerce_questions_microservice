import Question from '../models/Question.model.js';

export class QuestionDao {
    constructor() {

    }
    async findAll() {
        try {
            return await Question.find({ enabled: true });
        } catch(error){
            console.error('Error al obtener preguntas:', error.message)
            throw new Error('Error al obtener preguntas:', error.message)
        }
    }

    async countQuestions(filter){
        try {
            return await Question.countDocuments(filter);
        } catch(error){
            console.error('Error al contar preguntas:', error.message)
            throw new Error('Error al contar preguntas:', error.message)
        }
    }

    async aggregate(pipeline){
        try {
            return await Question.aggregate(pipeline);
        } catch(error){
            console.error('Error al organizar preguntas:', error.message)
            throw new Error('Error al organizar preguntas:', error.message)
        }
    }

    async findById(id){
        try {
            return await Question.findOne({_id: id, enabled: true})
        } catch(error){
            console.error(`Error al obtener pregunta con id ${id}:`, error.message)
            return null;
        }
    }

    async findForArticleId(articleId){
        try {
            return await Question.find({ articleId, enabled: true })
        } catch(error){
            console.error(`Error al obtener preguntas para articleId ${articleId}:`, error.message)
            throw new Error(`Error al obtener preguntas para articleId ${articleId}:`, error.message)
        }
    }

    async findForUserId(userId){
        try {
            return await Question.find({ userId, enabled: true })
        } catch(error){
            console.error(`Error al obtener preguntas para userId ${userId}:`, error.message)
            throw new Error(`Error al obtener preguntas para userId ${userId}:`, error.message)
        }
    }

    async insertOne(question){
        try {
            const {articleId, questionText, userId, createdAt} = question;

            if (!articleId || !questionText || !userId) {
                throw new Error('Faltan campos de la pregunta por rellenar');
            }

            const newQuestion = new Question({
                articleId,
                question: questionText,
                userId,
                createdAt
            });

            return await newQuestion.save();
        } catch(error){
            console.error('Error al agregar pregunta:', error.message)
            throw new Error('Error al agregar pregunta:', error.message)
        }
    }

    async insertMany(questions){
        try {
            return await Question.insertMany(questions)
        } catch(error){
            console.error('Error al agregar varios preguntas:', error.message)
            throw new Error('Error al agregar varios preguntas:', error.message)
        }
    }

    async updateById(id, updatedQuestion){
        try {
            const { articleId, question, userId, answer, answeredBy = null, answeredAt = null } = updatedQuestion;

            const questionUpdated = { articleId, question, answer, userId, answeredBy, answeredAt };
            return await Question.findByIdAndUpdate(id, { $set: questionUpdated }, { new: true });
        } catch(error){
            console.error(`Error al actualizar pregunta con id ${id}:`, error.message)
            throw new Error(`Error al actualizar pregunta con id ${id}:`, error.message)
        }
    }

    async deleteById(id){
        try {
            console.log(`Pregunta con id ${id} se eliminó`)
            return await Question.findByIdAndDelete(id)
        } catch(error){
            console.error(`Error al eliminar pregunta con id ${id}:`, error.message)
            throw new Error(`Error al eliminar pregunta con id ${id}:`, error.message)
        }
    }

    async updateMany(filter, update){
        try {
            return await Question.updateMany(filter, update)
        } catch(error){
            console.error('Error al actualizar preguntas:', error.message)
            throw new Error('Error al actualizar preguntas:', error.message)
        }
    }

    async paginate(query, options){
        try {
            const { limit, page } = options;
            return await Question.paginate(query, { limit, page })
        } catch (error) {
            console.error('Error al obtener preguntas:', error.message)
            throw new Error('Error al obtener preguntas:', error.message)
        }
    }
}
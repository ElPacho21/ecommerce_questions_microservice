import questionsController from '../controllers/questions.controller.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = (app) => {
    app.use('/questions', verifyToken, questionsController);

    app.use((req, res) => {
        res.status(404).send({ message: 'Ooops Page not found' });
    })
}

export default router;
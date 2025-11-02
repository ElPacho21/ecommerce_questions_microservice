import mongoose from 'mongoose';

import { mongoUri } from '../src/config/app.config.js';

const mongoConnect = async () => {
    try {
        await mongoose.connect(mongoUri);
        console.log('MongoDB conectado...');
    } catch (error) {
        console.log("Error al conectar Mongo: ", error)
    }
}

export default mongoConnect;
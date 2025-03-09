import mongoose from 'mongoose';
import log from './logger';

const DATABASE_URL = process.env.DATABASE_URL || 'mongodb://localhost:27017/test';

export class Database {
    static get connected() {
        return mongoose.connection.readyState === 1;
    }

    static async connect() {
        await mongoose.connect(DATABASE_URL);

        log.info('Connected to database');
    }

    static async disconnect() {
        await mongoose.disconnect();
        
        log.info('Disconnected from database');
    }

    static async routineCheck() {
        if (!this.connected) {
            log.error('Database is not connected, attempting to reconnect');
            await this.connect();
        }
    }
}
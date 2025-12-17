import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const databaseConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'lecture_attendance',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    entities: ['src/models/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
    ssl: process.env.DATABASE_HOST?.includes('supabase') ? { rejectUnauthorized: false } : false,
};

export const AppDataSource = new DataSource(databaseConfig);

export const initializeDatabase = async (): Promise<DataSource> => {
    try {
        await AppDataSource.initialize();
        console.log('✅ Database connection established successfully');
        return AppDataSource;
    } catch (error) {
        console.error('❌ Error connecting to database:', error);
        throw error;
    }
};

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function initializeDatabase(): void {
    const dbPath = path.join(app.getPath('userData'), 'db.sqlite');
    console.log('Database path:', dbPath);
    db = new Database(dbPath, { verbose: console.log });
    createTables();
}

function createTables(): void {
    const createUserTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            city TEXT,
            province TEXT
        )
    `;
    db.exec(createUserTableSQL);

    // 在这里添加其他表的创建语句
}

export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase first.');
    }
    return db;
}

export function closeDatabase(): void {
    if (db) {
        db.close();
    }
}
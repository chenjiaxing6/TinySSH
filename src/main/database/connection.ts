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
    // 创建 t_ssh 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS "t_ssh" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "sshName" TEXT,
        "password" TEXT,
        "ip" TEXT,
        "port" TEXT,
        "userName" TEXT,
        "conneType" TEXT,
        "certificate" TEXT,
        "createTime" DATE,
        "updateTime" DATE,
        "isDelete" TEXT,
        "folderId" INTEGER
      )
    `);

    // 创建 t_folder 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS "t_folder" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "folderName" TEXT,
        "parentId" INTEGER,
        "createTime" DATE,
        "updateTime" DATE,
        "isDelete" TEXT,
        "folderType" TEXT
      )
    `);

    // 创建 configs 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS "configs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建 config_items 表
    db.exec(`
      CREATE TABLE IF NOT EXISTS "config_items" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "config_id" INTEGER NOT NULL,
        "key" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "description" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (config_id, key)
      )
    `);
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
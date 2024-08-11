import {getDatabase} from './connection';

interface Folder {
    id?: number;
    folderName: string;
    parentId: number | null;
    create_time?: string;
    update_time?: string;
    is_delete: string;
    folder_type: string;
}

function getCurrentDateTime(): string {
    return new Date().toISOString();
}

export function getFolderInfo(): any {
    const db = getDatabase();
    const folderQuery = `WITH RECURSIVE folder_tree AS (SELECT id, folderName, parentId, 0 AS level
                                                        FROM t_folder
                                                        WHERE parentId IS NULL
                                                          AND isDelete != 'true'

                                                        UNION ALL

                                                        SELECT f.id, f.folderName, f.parentId, ft.level + 1
                                                        FROM t_folder f
                                                                 JOIN folder_tree ft ON f.parentId = ft.id
                                                        WHERE f.isDelete != 'true')
                         SELECT id, folderName, parentId, level
                         FROM folder_tree
                         ORDER BY level, id;`;

    return db.prepare(folderQuery).all();
}

// 创建文件夹
export function createFolder(folder: any): number {
    const db = getDatabase();
    const now = getCurrentDateTime();
    const stmt = db.prepare(`
        INSERT INTO t_folder (folderName, parentId, create_time, update_time, is_delete, folder_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(folder.folderName, folder.parentId, now, now, '1', '1');
    return info.lastInsertRowid as number;
}

// 获取所有文件夹
export function getAllFolders(): Folder[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM t_folder');
    return stmt.all();
}

// 根据 ID 获取文件夹
export function getFolderById(id: number): Folder | undefined {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM t_folder WHERE id = ?');
    return stmt.get(id);
}

// 更新文件夹
export function updateFolder(folder: Folder): number {
    const db = getDatabase();
    const now = getCurrentDateTime();
    const stmt = db.prepare(`
        UPDATE t_folder
        SET folderName  = ?,
            parentId    = ?,
            update_time = ?,
            is_delete   = ?,
            folder_type = ?
        WHERE id = ?
    `);
    const info = stmt.run(folder.folderName, folder.parentId, now, folder.is_delete, folder.folder_type, folder.id);
    return info.changes;
}

// 删除文件夹（软删除）
export function deleteFolder(id: number): number {
    const db = getDatabase();
    const now = getCurrentDateTime();
    const stmt = db.prepare(`
        UPDATE t_folder
        SET is_delete   = 'Y',
            update_time = ?
        WHERE id = ?
    `);
    const info = stmt.run(now, id);
    return info.changes;
}

// 获取子文件夹
export function getChildFolders(parentId: number): Folder[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM t_folder WHERE parentId = ?');
    return stmt.all(parentId);
}

// 根据文件夹类型获取文件夹
export function getFoldersByType(folderType: string): Folder[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM t_folder WHERE folder_type = ?');
    return stmt.all(folderType);
}
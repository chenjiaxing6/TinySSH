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
                                                        WHERE (parentId IS NULL)
                                                          AND isDelete != '1'

                                                        UNION ALL

                                                        SELECT f.id, f.folderName, f.parentId, ft.level + 1
                                                        FROM t_folder f
                                                                 JOIN folder_tree ft ON f.parentId = ft.id
                                                        WHERE f.isDelete != '1')
                         SELECT id, folderName, parentId, level
                         FROM folder_tree
                         ORDER BY level, id;`;

    return db.prepare(folderQuery).all();
}

// 创建文件夹
export function createFolder(folder: any): number {
    const db = getDatabase();
    const now = getCurrentDateTime();
    if (!folder.parentFolder) {
        folder.parentFolder = null;
    }
    const stmt = db.prepare(`
        INSERT INTO t_folder (folderName, parentId, createTime, updateTime, isDelete, folderType)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(folder.folderName, folder.parentFolder, now, now, '0', '1');
    return info.lastInsertRowid as number;
}

export function deleteFolder(folderId: number): void {
    const db = getDatabase();
    
    db.transaction(() => {
        // 递归删除子文件夹
        const deleteSubFolders = db.prepare(`
            WITH RECURSIVE subfolder(id) AS (
                SELECT id FROM t_folder WHERE id = ?
                UNION ALL
                SELECT f.id FROM t_folder f, subfolder s WHERE f.parentId = s.id
            )
            UPDATE t_folder SET isDelete = '1' WHERE id IN subfolder;
        `);
        
        // 删除关联的SSH连接
        const deleteRelatedSSH = db.prepare(`
            UPDATE t_ssh SET isDelete = '1' 
            WHERE folderId IN (
                WITH RECURSIVE subfolder(id) AS (
                    SELECT id FROM t_folder WHERE id = ?
                    UNION ALL
                    SELECT f.id FROM t_folder f, subfolder s WHERE f.parentId = s.id
                )
                SELECT id FROM subfolder
            );
        `);

        deleteSubFolders.run(folderId);
        deleteRelatedSSH.run(folderId);
    })();
}
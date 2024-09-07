import {getDatabase} from './connection';

export function getSshInfo(): any {
    const db = getDatabase();
    const sshQuery = `SELECT f.id AS folderId, s.id AS sshId, s.sshName, s.ip, s.port, s.userName
                      FROM t_folder f
                               LEFT JOIN t_ssh s ON f.id = s.folderId
                      WHERE f.isDelete != 'true'
                        AND (s.isDelete != 'true' OR s.isDelete IS NULL);`;

    return db.prepare(sshQuery).all();
}

export async function getSshInfoById(id: any): Promise<any> {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        try {
            const result = db.prepare(`
                SELECT *
                FROM t_ssh
                WHERE id = ?
                  AND isDelete != '1'
            `).get(id.toString());

            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
}
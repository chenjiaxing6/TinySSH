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
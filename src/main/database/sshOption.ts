import {getDatabase} from './connection';

export function getSshInfo(): any {
    const db = getDatabase();
    const sshQuery = `SELECT folderId, s.id AS sshId,s.password, s.sshName, s.ip, s.port, s.userName
                      FROM t_ssh s
                      WHERE s.isDelete != '1';`;

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

export function getAllSsh(): any {
    const db = getDatabase();
    const sshQuery = `SELECT * FROM t_ssh WHERE isDelete != '1'`;
    return db.prepare(sshQuery).all();
}

export async function createSsh(sshData: any): Promise<void> {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        try {
            db.prepare(`
                INSERT INTO t_ssh (folderId, sshName, ip, port, userName, password,isDelete)
                VALUES (?, ?, ?, ?, ?, ?,?)
            `).run(
                sshData.parentFolder,
                sshData.name,
                sshData.ip,
                sshData.port.toString(),
                sshData.username,
                sshData.password,
                '0',
            );
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export async function deleteSsh(sshId: number): Promise<void> {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        try {
            db.prepare(`
                UPDATE t_ssh
                SET isDelete = '1'
                WHERE id = ?
            `).run(sshId);
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export async function updateSsh(sshData: any): Promise<void> {
    const db = getDatabase();
    return new Promise((resolve, reject) => {
        try {
            db.prepare(`
                UPDATE t_ssh
                SET folderId = ?, sshName = ?, ip = ?, port = ?, userName = ?, password = ?
                WHERE id = ?
            `).run(
                sshData.parentFolder,
                sshData.name,
                sshData.ip,
                sshData.port,
                sshData.username,
                sshData.password,
                sshData.id
            );
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

export function saveSsh(sshList: any) {
    const db = getDatabase();
    const stmt = db.prepare(`INSERT INTO t_ssh (id, folderId, sshName, ip, port, userName, password,isDelete) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    sshList.forEach((ssh: any) => {
        stmt.run(ssh.id.toString(), ssh.folderId, ssh.sshName, ssh.ip, ssh.port.toString(), ssh.userName, ssh.password, ssh.isDelete);
    });
}
export function deleteAllSsh() {
    const db = getDatabase();
    const stmt = db.prepare(`DELETE FROM t_ssh`);
    stmt.run();
}


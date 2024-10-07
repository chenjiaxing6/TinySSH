import {ipcMain, dialog, BrowserWindow} from "electron";
import SSHHandler from "./sshHandler";
import * as sshOps from "../database/sshOption";
import path from "path";
import fs from "fs";

const SSH2Client = require('ssh2').Client;

class SFTPHandler {

    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    registerHandlers() {
        ipcMain.handle("get-sftp-list", (event, sftpData) => this.handleGetList(event, sftpData));
        ipcMain.handle("upload-sftp-file", (event, sftpData) => this.handleUploadFile(event, sftpData));
        ipcMain.handle("delete-sftp-file", (event, sftpData) => this.handleDeleteFile(event, sftpData));
        ipcMain.handle("change-sftp-file-permissions", (event, sftpData) => this.handleChangeFilePermissions(event, sftpData));
    }

    async handleGetList(event, sftpData) {
        try {
            let sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            return this.connectAndListFiles(sshInfo, sftpData.toPath);
        } catch (error) {
            console.error('Error in handleGetSftp:', error);
            throw error;
        }
    }

    async handleChangeFilePermissions(event, sftpData) {
        sftpData = JSON.parse(sftpData)
        console.log(sftpData)
        try {
            let sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            return this.connectAndChangeFilePermissions(sshInfo, sftpData.path, sftpData.files, sftpData.permissions, sftpData.ownerName, sftpData.groupName, sftpData.applyToSubfiles);
        } catch (error) {
            console.error('Error in handleChangeFilePermissions:', error);
            throw error;
        }
    }

    private connectAndChangeFilePermissions(sshInfo, path, files, permissions, ownerName, groupName, applyToSubfiles): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const conn = await this.connectSSH(sshInfo);
                this.changeFilePermissions(conn, path, files, permissions, ownerName, groupName, applyToSubfiles, resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private changeFilePermissions(conn, dirPath, files, permissions, ownerName, groupName, applyToSubfiles, resolve, reject) {
        conn.sftp((err, sftp) => {
            if (err) {
                console.log("连接 SFTP 错误", err);
                conn.end();
                reject(err);
                return;
            }
            console.log("开始更改文件权限");
    
            dirPath = dirPath.replace('~','/home/' + conn.config.username);
    
            const changePermissionsRecursively = async (filePath) => {
                try {
                    const stats:any = await new Promise((resolve, reject) => {
                        sftp.stat(filePath, (err, stats) => {
                            if (err) reject(err);
                            else resolve(stats);
                        });
                    });
    
                    await new Promise((resolve, reject) => {
                        sftp.chmod(filePath, parseInt(permissions, 8), (err) => {
                            if (err) reject(err);
                            else resolve(null);
                        });
                    });
    
                    await new Promise((resolve, reject) => {
                        sftp.chown(filePath, ownerName, groupName, (err) => {
                            if (err) reject(err);
                            else resolve(null);
                        });
                    });
    
                    if (stats.isDirectory() && applyToSubfiles) {
                        const list:any = await new Promise((resolve, reject) => {
                            sftp.readdir(filePath, (err, list) => {
                                if (err) reject(err);
                                else resolve(list);
                            });
                        });
    
                        for (const item of list) {
                            await changePermissionsRecursively(path.join(filePath, item.filename));
                        }
                    }
                } catch (error) {
                    console.error("更改权限时发生错误:", error);
                    throw error;
                }
            };
    
            const promises = files.map(file => {
                console.log("开始实际更改", dirPath, file);
                const filePath = path.join(dirPath, file);
                console.log("完整文件路径", filePath);
                return changePermissionsRecursively(filePath);
            });
    
            Promise.all(promises)
                .then(() => {
                    console.log("所有文件权限更改完成");
                    conn.end();
                    resolve();
                })
                .catch(err => {
                    console.error("更改文件权限过程中发生错误", err);
                    conn.end();
                    reject(err);
                });
        });
    }


    private connectSSH(sshInfo): Promise<any> {
        return new Promise((resolve, reject) => {
            const conn = new SSH2Client();
            conn.on('ready', () => {
                resolve(conn);
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: sshInfo.ip,
                port: sshInfo.port,
                username: sshInfo.userName,
                password: sshInfo.password
            });
        });
    }

    private connectAndListFiles(sshInfo, path): Promise<any[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const conn = await this.connectSSH(sshInfo);
                this.listFiles(conn, path, resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private listFiles(conn, path, resolve, reject) {
        conn.sftp((err, sftp) => {
            if (err) {
                conn.end();
                reject(err);
                return;
            }

            path = path.replace('~','/home/' + conn.config.username)

            sftp.readdir(path || '.', (err, list) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                const fileList = this.formatFileList(list);

                conn.end();
                resolve(fileList);
            });
        });
    }

    private formatFileList(list): any[] {
        return list.map(item => ({
            name: item.filename,
            size: item.attrs.size,
            modifyDate: new Date(item.attrs.mtime * 1000).toISOString(),
            permissions: item.attrs.mode.toString(8).slice(-4),
            type: item.attrs.isDirectory() ? 'directory' : 'file',
            owner: item.attrs.uid,
            group: item.attrs.gid,
        }));
    }

    async handleUploadFile(event, sftpData) {
        try {
            let sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            return this.connectAndUploadFile(sshInfo, sftpData.path, sftpData.filePath);
        } catch (error) {
            console.error('Error in handleUploadFile:', error);
            throw error;
        }
    }
    
    async handleDeleteFile(event, sftpData) {
        sftpData = JSON.parse(sftpData)
        try {
            let sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            return this.connectAndDeleteFile(sshInfo, sftpData.path, sftpData.files);
        } catch (error) {
            console.error('Error in handleDeleteFile:', error);
            throw error;
        }
    }

    private connectAndDeleteFile(sshInfo, remotePath, files): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const conn = await this.connectSSH(sshInfo);
                this.deleteFile(conn, remotePath, files, resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private deleteFile(conn, remotePath, files, resolve, reject) {
        conn.sftp((err, sftp) => {
            if (err) {
                conn.end();
                reject(err);
                return;
            }
            remotePath = remotePath.replace('~','/home/' + conn.config.username)
            
            const deleteRecursive = (sftp, path) => {
                return new Promise((resolve, reject) => {
                    sftp.stat(path, (err, stats) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        if (stats.isDirectory()) {
                            sftp.readdir(path, (err, list) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                Promise.all(list.map(item => deleteRecursive(sftp, `${path}/${item.filename}`)))
                                    .then(() => sftp.rmdir(path, resolve))
                                    .catch(reject);
                            });
                        } else {
                            sftp.unlink(path, resolve);
                        }
                    });
                });
            };
    
            const promises = files.map(file => {
                const filePath = path.join(remotePath, file);
                return deleteRecursive(sftp, filePath);
            });
    
            Promise.all(promises)
                .then(() => {
                    conn.end();
                    resolve(null);
                })
                .catch(err => {
                    conn.end();
                    reject(err);
                });
        });
    }

    private connectAndUploadFile(sshInfo, remotePath, localFilePath): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                const conn = await this.connectSSH(sshInfo);
                this.uploadFile(conn, remotePath, localFilePath, resolve, reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private uploadFile(conn, remotePath, localFilePath, resolve, reject) {
        conn.sftp((err, sftp) => {
            if (err) {
                conn.end();
                reject(err);
                return;
            }

            remotePath = remotePath.replace('~','/home/' + conn.config.username)
            const remoteFilePath = path.join(remotePath, path.basename(localFilePath));

            fs.stat(localFilePath, (err, stats) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                const totalSize = stats.size;
                let uploadedSize = 0;

                const readStream = fs.createReadStream(localFilePath);
                const writeStream = sftp.createWriteStream(remoteFilePath);

                readStream.on('data', (chunk) => {
                    uploadedSize += chunk.length;
                    const progress = Math.round((uploadedSize / totalSize) * 100);
                    // 发送进度信息到渲染进程
                    if (this.mainWindow && this.mainWindow.webContents) {
                        this.mainWindow.webContents.send('upload-progress', progress);
                    }
                });

                writeStream.on('close', () => {
                    console.log(`File ${localFilePath} uploaded successfully`);
                    conn.end();
                    resolve({ success: true, message: `File uploaded successfully` });
                });

                writeStream.on('error', (err) => {
                    console.error(`Error uploading file ${localFilePath}:`, err);
                    conn.end();
                    reject(err);
                });

                readStream.pipe(writeStream);
            });
        });
    }

    
}

export default SFTPHandler;
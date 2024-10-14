import { ipcMain, dialog, BrowserWindow } from "electron";
import SSHHandler from "./sshHandler";
import * as sshOps from "../database/sshOption";
import path from "path";
import fs from "fs";
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';

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
        ipcMain.handle("compress-file", (event, sftpData) => this.handleCompressFile(event, sftpData));
        ipcMain.handle("paste-sftp-file", (event, sftpData) => this.handlePasteFile(event, sftpData));
        ipcMain.handle("read-sftp-file", (event, sftpData) => this.handleReadFile(event, sftpData));
        ipcMain.on("write-sftp-file", (event, sftpData) => this.handleWriteFile(event, sftpData));
        ipcMain.handle("create-sftp-file", (event, sftpData) => this.handleCreateFile(event, sftpData));
    }

    async handleCreateFile(event, sftpData) {
        let conn;
        try {
            sftpData = JSON.parse(sftpData);
            const sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            conn = await this.connectSSH(sshInfo);
            sftpData.path = this.resolvePath(conn, sftpData.path);

            const sftp: any = await new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) reject(err);
                    else resolve(sftp);
                });
            });

            if (sftpData.fileType === 'file') {
                await new Promise((resolve, reject) => {
                    sftp.writeFile(sftpData.path, '', (err) => {
                        if (err) reject(err);
                        else resolve(null);
                    });
                });
            } else if (sftpData.fileType === 'folder') {
                await new Promise((resolve, reject) => {
                    sftp.mkdir(sftpData.path, (err) => {
                        if (err) reject(err);
                        else resolve(null);
                    });
                });
            } else {
                throw new Error('无效的文件类型');
            }

            return { success: true, message: '创建成功' };
        } catch (error: any) {
            console.error('创建文件/文件夹错误:', error);
            return { success: false, message: error.message };
        } finally {
            if (conn) conn.end();
        }
    }

    async handleWriteFile(event, sftpData) {
        let conn;
        try {
            sftpData = JSON.parse(sftpData)
            console.log('接收到的 sftpData:', sftpData);
            const sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            conn = await this.connectSSH(sshInfo);
            sftpData.path = this.resolvePath(conn, sftpData.path);
    
            const sftp: any = await new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) reject(err);
                    else resolve(sftp);
                });
            });
    
            console.log('文件路径:', sftpData.path);
            console.log('文件内容长度:', sftpData.content.length);
    
            await new Promise((resolve, reject) => {
                const writeStream = sftp.createWriteStream(sftpData.path);
                writeStream.on('finish', () => {
                    console.log('文件写入完成');
                    resolve(null);
                });
                writeStream.on('error', (err) => {
                    console.error('文件写入流错误:', err);
                    reject(err);
                });
                
                // 使用 Readable.from() 创建一个可读流
                const readableStream = Readable.from(sftpData.content);
                
                // 使用 pipeline 来处理流
                pipeline(readableStream, writeStream, (err) => {
                    if (err) {
                        console.error('管道处理错误:', err);
                        reject(err);
                    }
                });
            });
        } catch (error) {
            console.error('文件写入错误:', error);
            throw error;
        } finally {
            if (conn) conn.end();
        }
    }

    async handleReadFile(event, sftpData) {
        sftpData = JSON.parse(sftpData)

        const sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
        const conn = await this.connectSSH(sshInfo);
        sftpData.path = this.resolvePath(conn, sftpData.path);

        const sftp: any = await new Promise((resolve, reject) => {
            conn.sftp((err, sftp) => {
                if (err) reject(err);
                else resolve(sftp);
            });
        });

        const fileContent = await new Promise((resolve, reject) => {
            sftp.readFile(sftpData.path, (err, data) => {
                if (err) reject(err);
                else resolve(data.toString());
            });
        });

        conn.end();
        return fileContent;
    }

    async handlePasteFile(event, sftpData) {
        let conn;
        try {
            sftpData = JSON.parse(sftpData);
            const sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            conn = await this.connectSSH(sshInfo);
            sftpData.sourcePath = this.resolvePath(conn, sftpData.sourcePath);
            sftpData.targetPath = this.resolvePath(conn, sftpData.targetPath);

            const sftp: any = await new Promise((resolve, reject) => {
                conn.sftp((err, sftp) => {
                    if (err) reject(err);
                    else resolve(sftp);
                });
            });

            const totalFiles = sftpData.files.length;
            for (let i = 0; i < totalFiles; i++) {
                const file = sftpData.files[i];
                const sourcePath = path.posix.join(sftpData.sourcePath, file);
                const targetPath = path.posix.join(sftpData.targetPath, file);

                const stats: any = await new Promise((resolve, reject) => {
                    sftp.stat(sourcePath, (err, stats) => {
                        if (err) reject(err);
                        else resolve(stats);
                    });
                });

                if (stats.isDirectory()) {
                    await new Promise((resolve, reject) => {
                        let command = ''
                        if (sftpData.moveAndCopy === "copy") {
                            command = `cp -r ${sourcePath} ${targetPath}`;
                        } else {
                            command = `mv ${sourcePath} ${targetPath}`;
                        }
                        let stderr = '';

                        conn.exec(command, (err, stream) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            stream.on('close', (code) => {
                                if (code !== 0) {
                                    reject(new Error(`复制目录失败，退出码: ${code}，错误信息: ${stderr}`));
                                } else {
                                    resolve("粘贴成功");
                                }
                            });

                            stream.on('data', (data) => {
                                console.log('STDOUT: ' + data);
                            });

                            stream.stderr.on('data', (data) => {
                                stderr += data;
                                console.error('STDERR: ' + data);
                            });

                            // 添加超时处理
                            setTimeout(() => {
                                reject(new Error('复制操作超时'));
                                stream.close();
                            }, 120000); // 120秒超时，因为目录复制可能需要更长时间
                        });
                    });
                } else {
                    await new Promise((resolve, reject) => {
                        let command = ''
                        if (sftpData.moveAndCopy === "copy") {
                            command = `cp ${sourcePath} ${targetPath}`;
                        } else {
                            command = `mv ${sourcePath} ${targetPath}`;
                        }
                        let stderr = '';

                        conn.exec(command, (err, stream) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            stream.on('close', (code) => {
                                if (code !== 0) {
                                    reject(new Error(`复制文件失败，退出码: ${code}，错误信息: ${stderr}`));
                                } else {
                                    resolve("粘贴成功");
                                }
                            });

                            stream.on('data', (data) => {
                                console.log('STDOUT: ' + data);
                            });

                            stream.stderr.on('data', (data) => {
                                stderr += data;
                                console.error('STDERR: ' + data);
                            });

                            // 添加超时处理
                            setTimeout(() => {
                                reject(new Error('复制操作超时'));
                                stream.close();
                            }, 60000); // 60秒超时
                        });
                    });
                }
            }
            return "粘贴成功";
        } catch (error: any) {
            console.error('粘贴文件时发生错误:', error);
            this.mainWindow.webContents.send('paste-error', error.message);
            throw error; // 重新抛出错误，让 Electron 的 IPC 系统处理
        } finally {
            if (conn) conn.end();
        }
    }


    async handleCompressFile(event, sftpData) {
        sftpData = JSON.parse(sftpData)
        console.log(sftpData)
        // 压缩文件
        // {
        //     sshId: '10',
        //     sourcePath: '~',
        //     files: [ '.config' ],
        //     format: 'zip',
        //     name: '11',
        //     targetPath: '~'
        //   }
        return new Promise(async (resolve, reject) => {
            try {
                const sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
                const conn = await this.connectSSH(sshInfo);

                sftpData.sourcePath = this.resolvePath(conn, sftpData.sourcePath);
                sftpData.targetPath = this.resolvePath(conn, sftpData.targetPath);

                let command = ''
                if (sftpData.sourcePath === sftpData.targetPath) {
                    command = `cd "${sftpData.sourcePath}" && tar -czvf ${sftpData.name}.${sftpData.format} ${sftpData.files.join(' ')}`
                } else {
                    command = `cd "${sftpData.sourcePath}" && tar -czvf ${sftpData.name}.${sftpData.format} ${sftpData.files.join(' ')} && mv ${sftpData.name}.${sftpData.format} ${sftpData.targetPath}`
                }
                console.log(command)
                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        reject(err);
                        return;
                    }

                    stream.on('close', (code, signal) => {
                        conn.end();
                        if (code === 0) {
                            resolve('文件压缩成功');
                        } else {
                            reject(new Error(`压缩过程出错，退出码: ${code}`));
                        }
                    }).on('data', (data) => {
                        console.log('压缩输出:', data.toString());
                    }).stderr.on('data', (data) => {
                        console.error('压缩错误:', data.toString());
                    });
                });
            } catch (error) {
                reject(error);
            }
        });
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

            dirPath = this.resolvePath(conn, dirPath);

            const changePermissionsRecursively = async (filePath) => {
                try {
                    const stats: any = await new Promise((resolve, reject) => {
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
                        const list: any = await new Promise((resolve, reject) => {
                            sftp.readdir(filePath, (err, list) => {
                                if (err) reject(err);
                                else resolve(list);
                            });
                        });

                        for (const item of list) {
                            await changePermissionsRecursively(path.posix.join(filePath, item.filename));
                        }
                    }
                } catch (error) {
                    console.error("更改权限时发生错误:", error);
                    throw error;
                }
            };

            const promises = files.map(file => {
                console.log("开始实际更改", dirPath, file);
                const filePath = path.posix.join(dirPath, file);
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

            path = this.resolvePath(conn, path);

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
            size: this.formatFileSize(item.attrs.size),
            modifyDate: this.formatDate(item.attrs.mtime * 1000),
            permissions: item.attrs.mode.toString(8).slice(-3),
            type: item.attrs.isDirectory() ? 'directory' : 'file',
            owner: item.attrs.uid,
            group: item.attrs.gid,
        }));
    }

    private formatFileSize(bytes: number): string {
        if (bytes >= 1048576) { // 1 MB = 1048576 bytes
            return (bytes / 1048576).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
            return (bytes / 1024).toFixed(2) + ' KB';
        } else {
            return bytes + ' B';
        }
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/\//g, '-');
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
            remotePath = this.resolvePath(conn, remotePath);

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
                const filePath = path.posix.join(remotePath, file);
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

            remotePath = this.resolvePath(conn, remotePath);
            const remoteFilePath = path.posix.join(remotePath, path.basename(localFilePath));

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

    // 在 SFTPHandler 类中添加以下方法

    private resolvePath(conn, path: string): string {
        const username = conn.config.username;
        if (path.startsWith('~') || path === '') {
            return path.replace(/^~/, `/home/${username}`);
        }
        return path;
    }

}

export default SFTPHandler;
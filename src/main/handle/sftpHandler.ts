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

            console.log(path)
            sftp.readdir(path || '.', (err, list) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                const fileList = this.formatFileList(list);
                console.log(fileList);

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
            type: item.attrs.isDirectory() ? 'directory' : 'file'
        }));
    }

    async handleUploadFile(event, sftpData) {
        console.log('upload sftp file');
        console.log(sftpData)
        try {
            let sshInfo = await sshOps.getSshInfoById(sftpData.sshId);
            return this.connectAndUploadFile(sshInfo, sftpData.path, sftpData.filePath);
        } catch (error) {
            console.error('Error in handleUploadFile:', error);
            throw error;
        }
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
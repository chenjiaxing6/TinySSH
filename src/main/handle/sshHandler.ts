import {ipcMain, dialog, BrowserWindow} from "electron";
import * as sshOps from '../database/sshOption';
import {WebSocketServer} from "ws";

const SSH2Client = require('ssh2').Client;

class SSHHandler {
    private servers: Map<string, any> = new Map();
    private ports: Map<string, any> = new Map();
    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    registerHandlers() {
        ipcMain.on("enable-ws", (event, key, sshId) => this.handleEnableWs(event, key, sshId));
        ipcMain.handle("get-port", (event, key) => this.getAvailablePort(key));
        ipcMain.handle("create-ssh", (event, sshData) => this.handleCreateSsh(event, sshData));
        ipcMain.handle("delete-ssh", async (event, sshId) => {
          try {
            await sshOps.deleteSsh(sshId);
            return { success: true };
          } catch (error) {
            console.error('删除SSH失败:', error);
            throw error;
          }
        });

        ipcMain.handle("update-ssh", async (event, sshData) => {
          try {
            await sshOps.updateSsh(sshData);
            return { success: true };
          } catch (error) {
            console.error('更新SSH失败:', error);
            throw error;
          }
        });
    }

    private async handleEnableWs(event: Electron.IpcMainEvent, key: string, sshId: string) {
        try {
            let sshInfo = await sshOps.getSshInfoById(sshId);

            if (sshInfo === undefined) {
                dialog.showMessageBox(this.mainWindow, {
                    message: `未找到ssh连接信息！`,
                    type: "error"
                });
            } else {
                this.startWebSocketServer(key, {
                    host: sshInfo.ip,
                    port: sshInfo.port,
                    username: sshInfo.userName,
                    password: sshInfo.password
                });
            }
        } catch (error) {
            dialog.showMessageBox(this.mainWindow, {
                message: `获取SSH连接信息时发生错误：${error}`,
                type: "error"
            });
        }
    }

    private startWebSocketServer(key: string, sshConfig: any) {
        if (this.servers.has(key)) {
            return;
        }

        const port = this.getPortByKey(key);
        this.ports.set(key, port);
        const wss = new WebSocketServer({port});

        wss.on('connection', (ws) => {
            const conn = new SSH2Client();

            conn.on('ready', () => {
                conn.shell((err: any, stream: any) => {
                    if (err) {
                        ws.send(JSON.stringify({ type: 'error', message: '无法创建 SSH shell：' + err.message }));
                        ws.close();
                        return;
                    }

                    stream.on('data', (data: any) => {
                        ws.send(data);
                    });

                    stream.stderr.on('data', (data: any) => {
                        ws.send(data);
                    });

                    ws.on('message', (message: any) => {
                        stream.write(message);
                    });

                    ws.on('close', () => {
                        stream.close();
                        conn.end();
                    });
                });
            });

            conn.on('error', (err: any) => {
                let errorMessage = '连接错误';
                if (err.message.includes('authentication')) {
                    errorMessage = '身份验证失败，请检查用户名和密码';
                } else if (err.message.includes('connect ETIMEDOUT')) {
                    errorMessage = '连接超时，请检查主机地址和端口';
                } else if (err.message.includes('connect ECONNREFUSED')) {
                    errorMessage = '连接被拒绝，请检查主机地址和端口';
                }
                ws.send(errorMessage);
                ws.close();
            });

            conn.connect({
                host: sshConfig.host.toString(),
                port: sshConfig.port.toString(),
                username: sshConfig.username.toString(),
                password: sshConfig.password.toString(),
                readyTimeout: 10000 // 设置10秒超时
            });
        });

        this.servers.set(key, {wss, port, sshConfig});
    }

    private getAvailablePort(key: string) {
        for (let i = 1024; i < 65535; ++i) {
            if (!Array.from(this.ports.values()).includes(i)) {
                if (key) this.ports.set(key, i);
                return i;
            }
        }
    }

    private getPortByKey(key: string): number | undefined {
        return this.ports.get(key);
    }

    private async handleCreateSsh(event: Electron.IpcMainInvokeEvent, sshData: any) {
        try {
          await sshOps.createSsh(sshData);
          return { success: true };
        } catch (error) {
          console.error('创建SSH失败:', error);
          throw error;
        }
      }
    
}

export default SSHHandler;
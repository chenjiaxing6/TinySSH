import path from "path";
import { app, dialog, ipcMain } from "electron";
import appState from "../../app-state";
import WindowBase from "../window-base";
import FramelessWindow from "../frameless";
import axiosInst from "../../../lib/axios-inst/main";
import {WebSocket} from "vite";
import { WebSocketServer } from "ws";
const SSH2Client = require('ssh2').Client;
const pty = require('node-pty');

class PrimaryWindow extends WindowBase{
  constructor(){
    // 调用WindowBase构造函数创建窗口
    super({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    // 拦截close事件
    this._browserWindow?.on("close", (e) => {
      if(!appState.allowExitApp){
        this._browserWindow?.webContents.send("show-close-primary-win-msgbox");
        e.preventDefault();
      }
    });

    this.openRouter("/primary");
  }


  startWebSocketServer() {
    const sshConfig = {
      host: '192.168.0.103',
      port: 22,
      username: '',
      password: ''
    };

    let sshClient = new SSH2Client();
    sshClient.on('ready', () => {
      console.log('SSH连接成功');
    }).on('error', (err) => {
      console.error('SSH连接失败:', err);
    }).connect(sshConfig);

    console.log("开始ws")
    const wss = new WebSocketServer({ port: 8080 });
    let ptyProcess = null;
    wss.on("connection", (ws) => {
      console.log("New WebSocket connection");

      // 立即创建 pty 进程
      const ptyProcess = pty.spawn('ssh', [
        '-tt',  // 强制分配伪终端
        `${sshConfig.username}@${sshConfig.host}`,
        '-p', sshConfig.port.toString()
      ], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env
      });

      // 监听 pty 进程的输出
      ptyProcess.on('data', (data) => {
        console.log(`ssh data: ${data}`);
        ws.send(data);
      });

      ws.on("message", (message) => {
        console.log(`Received message: ${message}`);
        // 直接使用 ptyProcess，因为它已经被初始化
        ptyProcess.write(message);
      });

      ws.on("close", () => {
        console.log("WebSocket connection closed");
        ptyProcess.kill();
      });
    });

    console.log("WebSocket server is listening on ws://localhost:48821");
  }

  protected registerIpcMainHandler(): void{
    ipcMain.on("message", (event, message) => {
      if(!this.isIpcMainEventBelongMe(event))
        return;

      console.log(message);
    });
  
    ipcMain.on("show-frameless-sample-window", (event) => {
      if(!appState.framelessWindow?.valid){
        appState.framelessWindow = new FramelessWindow();
      }
      
      const win = appState.framelessWindow?.browserWindow;
      if(win){
        // 居中到父窗体中
        const parent = win.getParentWindow();
        if(parent){
          const parentBounds = parent.getBounds();
          const x = Math.round(parentBounds.x + (parentBounds.width - win.getSize()[0]) / 2);
          const y = Math.round(parentBounds.y + (parentBounds.height - win.getSize()[1]) / 2);

          win.setPosition(x, y, false);
        }
        win.show();
      }
    });
    
    function delay(time){
      return new Promise(resolve => setTimeout(resolve, time));
    }

    ipcMain.on("min-to-tray", (event) => {
      if(!this.isIpcMainEventBelongMe(event))
        return;

      this.browserWindow?.hide();

      if(appState.tray){
        appState.tray.displayBalloon({
          title: "electron-vue-boilerplate",
          content: "客户端已经最小化到系统托盘!"
        });
      }
    });
    
    ipcMain.handle("async-exit-app", async(event) => {
      // 暂停1500毫秒，模拟退出程序时的清理操作
      await delay(1500);
      appState.allowExitApp = true;
      app.quit();
    });

    ipcMain.on("enable-ws", (event, url) => {
      this.startWebSocketServer()
    });

    ipcMain.on("http-get-request", (event, url) => {
      axiosInst.get(url)
        .then((rsp) => {
          dialog.showMessageBox(this._browserWindow!, {
            message: `在主进程中请求 ${url} 成功！状态码：${rsp.status}`,
            type: "info"
          });
        })
        .catch((err) => {
          dialog.showMessageBox(this._browserWindow!, {
            message: `在主进程中请求 ${url} 失败！错误消息：${err.message}`,
            type: "error"
          });
        });
    });
  }
}

export default PrimaryWindow;

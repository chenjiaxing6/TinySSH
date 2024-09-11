import { BrowserWindow, app, dialog, session, Menu, globalShortcut } from "electron";
import log from "electron-log/main";
import PrimaryWindow from "./windows/primary";
import { CreateAppTray } from "./tray";
import appState from "./app-state";

// 禁用沙盒
// 在某些系统环境上，不禁用沙盒会导致界面花屏
// app.commandLine.appendSwitch("no-sandbox");

// 移除默认菜单栏
Menu.setApplicationMenu(null);

const gotLock = app.requestSingleInstanceLock();

// 如果程序只允许启动一个实例时，第二个实例启动后会直接退出
if(!gotLock && appState.onlyAllowSingleInstance){
  app.quit();
}else{
  app.whenReady().then(() => {
    if(!appState.initialize()){
      dialog.showErrorBox("App initialization failed", "The program will exit after click the OK button.",);
      app.exit();
      return;
    }

    log.info("App initialize ok");

    appState.primaryWindow = new PrimaryWindow();
    appState.tray = CreateAppTray();

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [ "script-src 'self'" ],
        },
      });
    });
  });

  // 当程序的第二个实例启动时，显示第一个实例的主窗口
  app.on("second-instance", () => {
    appState.primaryWindow?.browserWindow?.show();
  });

  app.on("activate", () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
    if(BrowserWindow.getAllWindows().length === 0)
      appState.primaryWindow = new PrimaryWindow();
  });

  app.on("window-all-closed", () => {
    if(process.platform !== "darwin")
      app.quit();
  });

  app.on("will-quit", () => {
    appState.uninitialize();
  });

  // 快捷键
  app.on('ready', () => {
    // 仅在应用程序获得焦点时注册快捷键
    app.on('browser-window-focus', () => {
      // 剪切、复制、粘贴
      globalShortcut.register('CommandOrControl+X', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.cut()
      })

      globalShortcut.register('CommandOrControl+C', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.copy()
      })

      globalShortcut.register('CommandOrControl+V', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.paste()
      })

      // 撤销、重做
      globalShortcut.register('CommandOrControl+Z', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.undo()
      })

      globalShortcut.register('CommandOrControl+Shift+Z', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.redo()
      })

      // 全选
      globalShortcut.register('CommandOrControl+A', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.selectAll()
      })

      // 刷新页面
      globalShortcut.register('CommandOrControl+R', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.reload()
      })

      // 强制刷新（清除缓存）
      globalShortcut.register('CommandOrControl+Shift+R', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.webContents.reloadIgnoringCache()
      })

      // 关闭窗口
      globalShortcut.register('CommandOrControl+W', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.close()
      })

      // 最小化窗口
      globalShortcut.register('CommandOrControl+M', () => {
        const win = BrowserWindow.getFocusedWindow()
        if (win) win.minimize()
      })
    })

    // 当应用程序失去焦点时注销快捷键
    app.on('browser-window-blur', () => {
      globalShortcut.unregisterAll()
    })
  })

  // 确保在应用退出时注销所有快捷键
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
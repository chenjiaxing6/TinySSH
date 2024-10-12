import {contextBridge, ipcRenderer} from "electron";

/*
暴露primary窗口主进程的方法到primary窗口的渲染进程
*/
contextBridge.exposeInMainWorld("primaryWindowAPI", {
    sendMessage: (message: string) => ipcRenderer.send("message", message),
    showFramelessSampleWindow: () => ipcRenderer.send("show-frameless-sample-window"),
    openExternalLink: (url: string) => ipcRenderer.send("open-external-link", url),
    clearAppConfiguration: () => ipcRenderer.send("clear-app-configuration"),
    onShowExitAppMsgbox: (callback) => ipcRenderer.on("show-exit-app-msgbox", () => {
        callback();
    }),
    onShowClosePrimaryWinMsgbox: (callback) => ipcRenderer.on("show-close-primary-win-msgbox", () => {
        callback();
    }),
    asyncExitApp: () => ipcRenderer.invoke("async-exit-app"),
    minToTray: () => ipcRenderer.send("min-to-tray"),
    httpGetRequest: (url: string) => ipcRenderer.send("http-get-request", url),
    enableWs: (key: string,sshId:string) => ipcRenderer.send("enable-ws", key,sshId),


    // 文件夹相关
    createFolder: (folderData: { parentFolder: string; folderName: string }) => 
        ipcRenderer.invoke("create-folder", folderData),
    getTreeInfo: () => ipcRenderer.invoke("get-tree-info"),

    // ssh 相关
    getPort: (key:string) => ipcRenderer.invoke("get-port",key),

    deleteFolder: (folderId: number) => ipcRenderer.invoke("delete-folder", folderId),

    createSsh: (sshData: { parentFolder: string; name: string; ip: string; port: number; username: string; password: string }) => 
        ipcRenderer.invoke("create-ssh", sshData),
    deleteSsh: (sshId: number) => ipcRenderer.invoke("delete-ssh", sshId),
    updateSsh: (sshData: { id: number; parentFolder: string; name: string; ip: string; port: number; username: string; password: string }) => 
        ipcRenderer.invoke("update-ssh", sshData),
    updateFolder: (folderData: { id: number; parentFolder: string; folderName: string }) => 
        ipcRenderer.invoke("update-folder", folderData),

    // sftp
    getSftpList:(param:string) => ipcRenderer.invoke("get-sftp-list",param),
    uploadSftpFile: (param) => ipcRenderer.invoke('upload-sftp-file', param),
    onUploadProgress: (callback) => ipcRenderer.on('upload-progress', (_event, value) => callback(value)),
    deleteSftpFile: (param) => ipcRenderer.invoke('delete-sftp-file', param),
    changeSftpFilePermissions: (param) => ipcRenderer.invoke('change-sftp-file-permissions', param),
    compressSftpFiles: (param) => ipcRenderer.invoke('compress-file', param),
    pasteSftpFile: (param) => ipcRenderer.invoke('paste-sftp-file', param),
    readSftpFile: (param) => ipcRenderer.invoke('read-sftp-file', param),
    writeSftpFile: (param) => ipcRenderer.send('write-sftp-file', param),
    createSftpFile: (param) => ipcRenderer.invoke('create-sftp-file', param),

    // 设置
    testWebDav: (param) => ipcRenderer.invoke('test-webdav', param),
    saveSyncSettings: (param) => ipcRenderer.invoke('save-sync-settings', param),
    asyncUploadData: () => ipcRenderer.invoke('async-upload-data'),
    asyncDownloadData: () => ipcRenderer.invoke('async-download-data'),
    getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
});

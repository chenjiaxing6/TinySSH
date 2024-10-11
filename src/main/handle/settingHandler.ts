import { BrowserWindow, ipcMain } from 'electron';
import * as syncOps from '../database/configOption';
import * as sshOps from '../database/sshOption';
import * as folderOps from '../database/folderOption';
class SettingHandler {

    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    registerHandlers() {
        ipcMain.handle("test-webdav", (event, param) => this.handleTestWebDav(event, param));
        ipcMain.handle("save-sync-settings", (event, param) => this.handleSaveSyncSettings(event, param));
        ipcMain.handle("async-upload-data", (event) => this.handleUploadData(event));
        ipcMain.handle("async-download-data", (event) => this.handleDownloadData(event));
    }

    

    async handleSaveSyncSettings(event: any, param: any) {
        const settings = JSON.parse(param);
        // 设置当前同步方式
        const syncMethodConfig: any = [];
        syncMethodConfig.push({
            key: 'syncMethod',
            value: settings.method,
            description: '同步方式设置'
        });
        syncOps.setConfig("syncMethod", syncMethodConfig);

        // 设置同步方式下的配置
        const configItems: any = [];
        for (const [key, value] of Object.entries(settings.webdav)) {
            configItems.push({
                key: key,
                value: value,
                description: `${settings.method} ${key} 设置`
            });
        }
    
        syncOps.setConfig(settings.method, configItems);
        console.log('保存设置:', settings);
        return { success: true, message: '设置已保存' };
    }

    async handleTestWebDav(event: any, param: any) {
        try {
            const { url, username, password } = JSON.parse(param).webdav;
            console.log(url, username, password)
            const { createClient } = await import('webdav');
            const client = createClient(url, {
                username,
                password
            });
            
            // 尝试获取根目录内容来测试连接
            await client.getDirectoryContents('/');
            
            return { success: true, message: '连接成功' };
        } catch (error: any) {
            console.error('WebDAV连接测试失败:', error);
            return { success: false, message: '连接失败: ' + error.message };
        }
    }

    // 上传数据
    async handleUploadData(event: any) {
        // 查询当前的同步方式
        const syncMethod = await syncOps.getConfig("syncMethod");
        if(syncMethod[0].value === "webdav"){
            // 上传到webdav
            const allFolders = await folderOps.getAllFolders();
            // 转换为json文件
            const foldersJson = JSON.stringify(allFolders);
            const allSsh = await sshOps.getAllSsh();
            const sshJson = JSON.stringify(allSsh);

            // 获取WebDAV配置
            const webdavConfig = await syncOps.getConfig("webdav");
            const { url, username, password } = webdavConfig.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const { createClient } = await import('webdav');
            const client = createClient(url, { username, password });

            try {
                // 上传文件夹数据
                await client.putFileContents('/folders.json', foldersJson, { overwrite: true });
                console.log('文件夹数据上传成功');

                // 上传SSH数据
                await client.putFileContents('/ssh.json', sshJson, { overwrite: true });
                console.log('SSH数据上传成功');
                return { success: true, message: '数据上传成功' };
            } catch (error: any) {
                console.error('数据上传失败:', error);
                return { success: false, message: '数据上传失败: ' + error.message };
            }
        }
    }
    

    // 下载数据
    async handleDownloadData(event: any) {
        // 查询当前的同步方式
        const syncMethod = await syncOps.getConfig("syncMethod");
        if(syncMethod[0].value === "webdav"){
            // 下载webdav数据
            const { createClient } = await import('webdav');
            const webdavConfig = await syncOps.getConfig("webdav");
            const { url, username, password } = webdavConfig.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
            const client = createClient(url, { username, password });
            
            const foldersJson = await client.getFileContents('/folders.json');
            const sshJson = await client.getFileContents('/ssh.json');
            // 保存到数据库
            // 先删除数据
            folderOps.deleteAllFolders();
            sshOps.deleteAllSsh();
            folderOps.saveFolders(JSON.parse(foldersJson.toString()));
            sshOps.saveSsh(JSON.parse(sshJson.toString()));

            return { success: true, message: '数据下载成功' };
        }
    }
}

export default SettingHandler;
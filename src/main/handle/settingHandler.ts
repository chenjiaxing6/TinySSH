import { BrowserWindow, ipcMain } from 'electron';
import * as syncOps from '../database/configOption';
class SettingHandler {

    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    registerHandlers() {
        ipcMain.handle("test-webdav", (event, param) => this.handleTestWebDav(event, param));
        ipcMain.handle("save-sync-settings", (event, param) => this.handleSaveSyncSettings(event, param));
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
}

export default SettingHandler;
import { BrowserWindow, ipcMain } from 'electron';
import * as syncOps from '../database/configOption';
import * as sshOps from '../database/sshOption';
import * as folderOps from '../database/folderOption';
import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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
        ipcMain.handle("get-config", (event, key) => this.handleGetConfig(event, key));
    }

    async handleGetConfig(event: any, key: string) {
        const config = await syncOps.getConfig(key);
        return config;
    }


    async handleSaveSyncSettings(event: any, param: any) {
        console.log('保存同步设置:', param)
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
        for (const [key, value] of Object.entries(settings[settings.method])) {
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
            // 判断同步方式
            const syncMethod = JSON.parse(param).method;
            switch (syncMethod) {
                case 'webdav':
                    return await this.testWebDav(param);
                case 's3':
                    return await this.testS3(param);
                default:
                    return { success: false, message: '不支持的同步方式' };
            }

        } catch (error: any) {
            console.error('WebDAV连接测试失败:', error);
            return { success: false, message: '连接失败: ' + error.message };
        }
    }

    async testS3(param: any) {
        const syncForm = JSON.parse(param);
        const client = new S3Client({
            endpoint: syncForm.s3.endpoint,
            region: syncForm.s3.region,
            credentials: {
                accessKeyId: syncForm.s3.accessKeyId,
                secretAccessKey: syncForm.s3.secretAccessKey,
            },
        });
        const command = new ListBucketsCommand({});
        const response = await client.send(command);
        console.log(response);
        return { success: true, message: '连接成功' };
    }

    async testWebDav(param: any) {
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
    }

    // 上传数据
    async handleUploadData(event: any) {
        // 查询当前的同步方式
        const syncMethod = await syncOps.getConfig("syncMethod");
        const allFolders = await folderOps.getAllFolders();
        // 转换为json文件
        const foldersJson = JSON.stringify(allFolders);
        const allSsh = await sshOps.getAllSsh();
        const sshJson = JSON.stringify(allSsh);
        if (syncMethod[0].value === "webdav") {
            // 上传到webdav
            return await this.uploadByWebDav(foldersJson, sshJson);
        } else if (syncMethod[0].value === "s3") {
            // 上传到s3
            return await this.uploadByS3(foldersJson, sshJson);
        }
    }

    async uploadByS3(foldersJson: string, sshJson: string) {
        // 上传到S3
        try {
            const s3Config = await syncOps.getConfig("s3");
            const { endpoint, region, accessKeyId, secretAccessKey, bucket } = s3Config.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const client = new S3Client({
                endpoint,
                region,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });

            // 上传文件夹数据
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: 'folders.json',
                Body: foldersJson,
            }));
            console.log('文件夹数据上传成功');

            // 上传SSH数据
            await client.send(new PutObjectCommand({
                Bucket: bucket,
                Key: 'ssh.json',
                Body: sshJson,
            }));
            console.log('SSH数据上传成功');

            return { success: true, message: '数据上传成功' };
        } catch (error: any) {
            console.error('数据上传失败:', error);
            if (error instanceof SyntaxError) {
                return { success: false, message: '数据上传失败: S3配置解析错误，请检查配置是否为有效的JSON格式' };
            } else {
                return { success: false, message: '数据上传失败: ' + error.message };
            }
        }
    }

    async uploadByWebDav(foldersJson: string, sshJson: string) {
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


    // 下载数据
    async handleDownloadData(event: any) {
        // 查询当前的同步方式
        const syncMethod = await syncOps.getConfig("syncMethod");
        if (syncMethod[0].value === "webdav") {
            return await this.downloadByWebDav();
        } else if (syncMethod[0].value === "s3") {
            return await this.downloadByS3();
        }
    }

    async downloadByWebDav() {
        try {
            // 下载webdav数据
            const { createClient } = await import('webdav');
            const webdavConfig = await syncOps.getConfig("webdav");
            const { url, username, password } = Object.fromEntries(webdavConfig.map(item => [item.key, item.value]));
            const client = createClient(url, { username, password });

            const [foldersJson, sshJson] = await Promise.all([
                client.getFileContents('/folders.json'),
                client.getFileContents('/ssh.json')
            ]);

            // 保存到数据库
            await Promise.all([
                folderOps.deleteAllFolders(),
                sshOps.deleteAllSsh()
            ]);

            await Promise.all([
                folderOps.saveFolders(JSON.parse(foldersJson.toString())),
                sshOps.saveSsh(JSON.parse(sshJson.toString()))
            ]);

            return { success: true, message: '数据下载成功' };
        } catch (error: any) {
            console.error('WebDAV数据下载失败:', error);
            return { success: false, message: `数据下载失败: ${error.message}` };
        }
    }

    async downloadByS3() {
        // 下载s3数据
        const s3Config = await syncOps.getConfig("s3");
        const { endpoint, region, accessKeyId, secretAccessKey, bucket } = s3Config.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        const client = new S3Client({
            endpoint,
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });

        try {
            // 下载文件夹数据
            const foldersResponse = await client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: 'folders.json'
            }));
            let foldersJson = '';
            if (foldersResponse.Body) {
                foldersJson = await foldersResponse.Body.transformToString();
            } else {
                return { success: false, message: '文件夹数据下载失败' };
            }

            // 下载SSH数据
            let sshJson = '';
            const sshResponse = await client.send(new GetObjectCommand({
                Bucket: bucket,
                Key: 'ssh.json'
            }));
            if (sshResponse.Body) {
                sshJson = await sshResponse.Body.transformToString();
            } else {
                return { success: false, message: 'SSH数据下载失败' };
            }

            // 保存到数据库
            // 先删除数据
            folderOps.deleteAllFolders();
            sshOps.deleteAllSsh();
            folderOps.saveFolders(JSON.parse(foldersJson));
            sshOps.saveSsh(JSON.parse(sshJson));

            return { success: true, message: '数据下载成功' };
        } catch (error: any) {
            console.error('数据下载失败:', error);
            return { success: false, message: '数据下载失败: ' + error.message };
        }
    }
}

export default SettingHandler;
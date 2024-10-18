import { ipcMain } from 'electron';
import * as folderOps from '../database/folderOption';
import * as sshOps from '../database/sshOption';

export function registerFolderHandlers() {
    ipcMain.handle("create-folder", async (event, folderData) => {
        try {
            await folderOps.createFolder(folderData);
            return { success: true };
        } catch (error:any) {
            console.error('创建文件夹失败:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("get-tree-info", (event) => {
        const folderData = folderOps.getFolderInfo();
        const sshData = sshOps.getSshInfo();

        const folderMap = new Map();

        // 创建文件夹树
        folderData.forEach(folder => {
            folderMap.set(folder.id, { ...folder, type: 'folder', children: [] ,title: folder.folderName,key: folder.id+'-folder' });
        });
        // 构建树结构
        const rootFolders = [] as any[];
        folderMap.forEach(folder => {
            if (folder.parentId === null) {
                rootFolders.push(folder);
            } else {
                const parent = folderMap.get(folder.parentId);
                if (parent) {
                    parent.children.push(folder);
                }
            }
        });

        // 添加SSH连接信息到children或根目录
        sshData.forEach(ssh => {
            if (ssh.sshId !== null) {
                const sshNode = {
                    ...ssh,
                    type: 'ssh',
                    password: ssh.password,
                    title: ssh.sshName,
                    key: ssh.sshId+'-ssh',
                    children: []
                };
                if (ssh.folderId === null || ssh.folderId === undefined || ssh.folderId === '') {
                    // 如果SSH没有关联文件夹，添加到根目录
                    rootFolders.push(sshNode);
                } else {
                    // 如果SSH关联了文件夹，添加到对应文件夹的children
                    const folder = folderMap.get(ssh.folderId);
                    if (folder) {
                        folder.children.push(sshNode);
                    }
                }
            }
        });

        return rootFolders;
    });

    ipcMain.handle("delete-folder", async (event, folderId) => {
        try {
            await folderOps.deleteFolder(folderId);
            return { success: true };
        } catch (error: any) {
            console.error('删除文件夹失败:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("update-folder", async (event, folderData) => {
        try {
            await folderOps.updateFolder(folderData);
            return { success: true };
        } catch (error:any) {
            console.error('更新文件夹失败:', error);
            return { success: false, error: error.message };
        }
    });

    // 添加其他数据库操作的监听器...
}
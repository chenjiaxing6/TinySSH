import { ipcMain } from 'electron';
import * as folderOps from '../../../database/folderOption';
import * as sshOps from '../../../database/sshOption';

export function registerFolderHandlers() {
    ipcMain.on("create-folder", (event, message) => {
        folderOps.createFolder({folderName: message});
    });

    ipcMain.handle("get-tree-info", (event) => {
        const folderData = folderOps.getFolderInfo();
        const sshData = sshOps.getSshInfo();

        const folderMap = new Map();

        // 创建文件夹树
        folderData.forEach(folder => {
            folderMap.set(folder.id, { ...folder, type: 'folder', children: [] ,title: folder.folderName,key: folder.id });
        });
        debugger
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

        // 添加SSH连接信息到children
        sshData.forEach(ssh => {
            if (ssh.sshId !== null){
                const folder = folderMap.get(ssh.folderId);
                if (folder) {
                    folder.children.push({
                        ...ssh,
                        type: 'ssh',
                        title: ssh.sshName,
                        key: ssh.sshId,
                        children: [] // SSH 连接没有子节点，但为了统一结构，我们添加一个空数组
                    });
                }
            }
        });

        return rootFolders;
    });
    // 添加其他数据库操作的监听器...
}
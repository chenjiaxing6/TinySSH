import {getDatabase} from './connection';

export function getConfig(configName: string): any {
    const db = getDatabase();
    const configQuery = `SELECT * FROM configs left join config_items on configs.id = config_items.config_id WHERE configs.name = ?;`;
    return db.prepare(configQuery).get(configName);
}

export function setConfig(configName: string, configItems: any): any {
    const db = getDatabase();
    let configId: any;
    
    db.transaction(() => {
        // 首先检查配置是否已存在
        const existingConfig = db.prepare('SELECT id FROM configs WHERE name = ?').get(configName);
        
        if (existingConfig) {
            // 如果配置已存在，更新现有项目
            configId = existingConfig.id;
            // 删除现有的配置项
            db.prepare('DELETE FROM config_items WHERE config_id = ?').run(configId);
        } else {
            // 如果配置不存在，创建新配置
            const result = db.prepare('INSERT INTO configs (name) VALUES (?)').run(configName);
            configId = result.lastInsertRowid;
        }

        // 插入新的配置项
        for (const item of configItems) {
            const configItemQuery = `INSERT INTO config_items (config_id, key, value, description) VALUES (?, ?, ?, ?)`;
            db.prepare(configItemQuery).run(configId, item.key, item.value, item.description);
        }
    })();

    return configId;
}


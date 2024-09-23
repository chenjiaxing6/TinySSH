<template>
  <a-split :style="{
    height: '100%',
    width: '100%',
    minWidth: '500px',
  }" v-model:size="size" min="80px">
    <!--主机列表-->
    <template #first>
      <div class="tree-container">
        <div style="background-color: rgb(242, 242, 242);height: 100%;padding: 8px">
          <a-tree :data="filteredTreeData" @select="handleSelect" :selected-keys="selectedKeys">

          </a-tree>
        </div>
        <div class="tree-footer"
             style="display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 0;">
          <a-input-search v-model="searchKeyword" placeholder="筛选" style="width: calc(100% - 20px); height: 24px;"
                          size="mini" @input="handleSearch"/>
          <div>
            <a-button shape="circle" size="mini" style="margin-left: 8px;" @click="refreshTree">
              <icon-refresh/>
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <!--文件列表-->
    <template #second>
      <div class="tab-container">
        <a-tabs v-if="data.length > 0" type="card" :editable="true" @delete="handleDelete" :active-key="activeTabKey" style="height: calc(100% - 10px)">
          <a-tab-pane v-for="(item, index) of data" :key="item.randomId" :title="item.title" style="height: 100%">
            <div class="sftp-container"
                 style="padding-left: 16px; padding-right: 16px; height: 100%; display: flex; flex-direction: column;">
              <div class="path-display">
                <!-- 输入框 -->
                <a-input-group style="width: 100%; margin-bottom: 10px;margin-top: 10px;">
                  <a-button @click="enterDirectoryRoot(item)">
                    <icon-home/>
                  </a-button>
                  <a-input v-model="item.currentDirectory" style="width: calc(100% - 32px);"
                           @press-enter="enterDirectoryInput(item)"/>
                </a-input-group>
                <!-- 按钮 -->
                <div class="action-buttons" style="margin-bottom: 10px;">
                  <a-button size="small" @click="createFile" type="primary">创建</a-button>
                  <a-button-group size="small">
                    <a-button @click="openUpload(item)">上传</a-button>
                    <a-button @click="copyFile">复制</a-button>
                    <a-button @click="moveFile">移动</a-button>
                    <a-button @click="compressFile">压缩</a-button>
                    <a-button @click="changePermissions">权限</a-button>
                    <a-button @click="deleteFile">删除</a-button>
                  </a-button-group>
                </div>
              </div>
              <!-- 列表 -->
              <div style="overflow-y: auto;">
                <a-table :data="item.fileList" :pagination="false" :scroll="{ y: '90%' }">
                  <template #columns>
                    <a-table-column title="名称" data-index="name">
                      <template #cell="{ record }">
                        <a-space>
                          <icon-folder v-if="record.type === 'directory'" style="cursor: pointer"
                                       @click="enterDirectory(record,item)"/>
                          <icon-file v-else/>
                          <span v-if="record.type === 'directory'" style="cursor: pointer"
                                @click="enterDirectory(record,item)">{{ record.name }}</span>
                          <span v-else>{{ record.name }}</span>
                        </a-space>
                      </template>
                    </a-table-column>
                    <a-table-column title="大小" data-index="size"/>
                    <a-table-column title="修改日期" data-index="modifyDate"/>
                    <a-table-column title="权限" data-index="permissions"/>
                  </template>
                </a-table>
              </div>

              <!-- 文件上传 -->
              <a-modal v-model:visible="item.showUploadDialog" :hide-title="true" :footer="false" :width="500">
                <a-upload draggable
                          :custom-request="handleUpload"
                          :file-list="item.uploadList"
                          multiple/>
              </a-modal>
            </div>
          </a-tab-pane>
        </a-tabs>
        <!-- 空状态 -->
        <div v-else class="empty-state">
          <icon-computer :style="{ fontSize: '48px', color: '#c2c2c2' }"/>
          <p>双击左侧主机节点连接SFTP</p>
        </div>
      </div>
    </template>
  </a-split>
</template>
<script setup lang="ts">
import {reactive, ref, h, onMounted, nextTick, computed} from 'vue';
import {IconFolder, IconComputer, IconSettings, IconRefresh, IconHome} from '@arco-design/web-vue/es/icon';
import "xterm/css/xterm.css"
import {Message} from '@arco-design/web-vue';
// 定义响应式数据
const size = ref(0.25);
const showContextMenu = ref(false);
const selectedNode: any = ref(null);
const selectedKeys = ref([]);
const searchKeyword = ref('');
const treeData = ref([]);
const data: any = ref([]);
const activeTabKey = ref<string | null>(null);

const fileList = ref([])

// 计算属性
const filteredTreeData = computed(() => {
  return searchKeyword.value ? filterTree(treeData.value, searchKeyword.value.toLowerCase()) : treeData.value;
});


function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

function handleSelect(keys: any, event: any) {
  if (selectedNode.value && selectedNode.value.key === event.node.key) {
    openSSH(event);
  } else {
    selectedNode.value = event.node;
    selectedKeys.value = keys;
  }
}

async function openSSH(event: any) {
  if (event.node.type === 'ssh') {
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    let sshId = event.node.key.split("-")[0]
    let dir = '~'
    getElectronApi().getSftpList({'sshId': sshId, 'toPath': dir}).then((res: any) => {
      // 将文件排序，文件夹在前，文件在后
      res.sort((a: any, b: any) => {
        if (a.type === 'directory' && b.type !== 'directory') {
          return -1;
        } else if (a.type !== 'directory' && b.type === 'directory') {
          return 1;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
      data.value.push({
        randomId: event.node.key.split("-")[0]+"-"+randomId,
        id: event.node.key,
        title: event.node.title,
        ip: event.node.title,
        fileList: res,
        currentDirectory: dir,
        sshId: sshId,
      });
      activeTabKey.value = event.node.key.split("-")[0]+"-"+randomId
    })
  }
}

async function enterDirectory(record: any, item: any) {
  let sshId = item.sshId
  let targetPath = item.currentDirectory
  if (targetPath.endsWith('/')) {
    targetPath += record.name
  } else {
    targetPath += '/' + record.name
  }
  getElectronApi().getSftpList({'sshId': sshId, 'toPath': targetPath}).then((res: any) => {
    // 将文件排序，文件夹在前，文件在后
    res.sort((a: any, b: any) => {
      if (a.type === 'directory' && b.type !== 'directory') {
        return -1;
      } else if (a.type !== 'directory' && b.type === 'directory') {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    item.fileList = res
    item.currentDirectory = targetPath
  })
}

function enterDirectoryInput(item: any) {
  getElectronApi().getSftpList({'sshId': item.sshId, 'toPath': item.currentDirectory}).then((res: any) => {
    // 将文件排序，文件夹在前，文件在后
    res.sort((a: any, b: any) => {
      if (a.type === 'directory' && b.type !== 'directory') {
        return -1;
      } else if (a.type !== 'directory' && b.type === 'directory') {
        return 1;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    item.fileList = res
  })
}

const currentItem:any = ref(null)
function openUpload(item: any) {
  item.showUploadDialog = true
  currentItem.value = item
}

const handleUpload = async (option: any) => {
  let sshId = activeTabKey.value.split("-")[0]
  const {fileItem, onProgress, onSuccess, onError} = option
  try {
    // 开始上传时显示进度
    onProgress({percent: 0})

    // 获取文件路径
    const filePath = fileItem.file.path

    // 如果没有 path 属性（例如在某些网络浏览器中），可以使用临时文件
    // const filePath = await saveTemporaryFile(fileItem.file)

    let param = {
      "sshId": sshId,
      "path": currentItem.value.currentDirectory,
      "filePath": filePath,
      "fileName": fileItem.file.name
    }

    console.log(param)
    // 调用 Electron 的主进程来处理文件上传
    const result = await getElectronApi().uploadSftpFile(param)

    console.log(result)
    // 上传完成
    onProgress({percent: 100})
    onSuccess(result)
    Message.success(`文件 ${fileItem.file.name} 上传成功`)
  } catch (error) {
    onError(error)
    Message.error(`文件 ${fileItem.file.name} 上传失败: ${error.message}`)
  }
}

// 如果需要处理没有 path 的文件（例如从浏览器拖放的文件）
async function saveTemporaryFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const buffer = event.target.result
        const tempPath = await getElectronApi().saveTempFile(file.name, buffer)
        resolve(tempPath)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

function enterDirectoryRoot(item: any) {
  item.currentDirectory = '~'
  enterDirectoryInput(item)
}

// 搜索过滤
function filterTree(nodes: any, keyword: any) {
  if (!keyword) {
    return nodes;
  }
  return nodes.filter((node: any) => {
    if (node.title.toLowerCase().includes(keyword)) {
      return true;
    }
    if (node.children && node.children.length) {
      const filteredChildren = filterTree(node.children, keyword);
      if (filteredChildren.length) {
        return true;
      }
    }
    return false;
  });
}

function refreshTree() {
  getTreeData();
  Message.success('刷新主机列表成功');
}

function handleSearch() {
  if (!searchKeyword.value) {
    getTreeData();
  }
}

// tab相关
function handleDelete(key: any) {
  data.value = data.value.filter((item: any) => item.randomId !== key)
}

// 添加一个新的方法来处理标签页切换
function handleTabChange(key: string) {
  activeTabKey.value = key;
}

// 列表相关
function getTreeData() {
  getElectronApi().getTreeInfo().then((res: any) => {
    res.forEach(addIconToProps);
    treeData.value = res;
  })
}

function addIconToProps(node: any) {
  if (node.type === 'folder') {
    node.icon = () => h(IconFolder);
  } else if (node.type === 'ssh') {
    node.icon = () => h(IconComputer);
  }
  if (node.children) {
    node.children.forEach(addIconToProps);
  }
}

// 生命周期钩子
onMounted(() => {
  getTreeData()
})

// 事件监听器
document.addEventListener('click', () => {
  showContextMenu.value = false;
});

</script>

<style scoped>
.tree-container {
  display: flex;
  flex-direction: column;
  height: 100%
}

.tree-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px;
}

.tab-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.terminal-wrapper {
  background-color: red;
  width: 100%;
  height: calc(100% - 20px);
}

.terminal-container {
  width: 100%;
  height: 100%;
}

:deep(.arco-tabs-content) {
  padding-top: 2px;
  height: 100%;
}

:deep(.arco-tabs-content-list) {
  height: 100%;
}

:deep(.arco-tabs-pane) {
  height: 100%;
}

:deep(.terminal) {
  height: 100%;
}

.context-menu {
  background: white;
  border: 1px solid #ccc;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.input-container {
  height: 30px;
  padding: 5px;
  background-color: #f0f0f0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100% - 40px);
  color: #888;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}
</style>
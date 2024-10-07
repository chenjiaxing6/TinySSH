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
            size="mini" @input="handleSearch" />
          <div>
            <a-button shape="circle" size="mini" style="margin-left: 8px;" @click="refreshTree">
              <icon-refresh />
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <!--文件列表-->
    <template #second>
      <div class="tab-container">
        <a-tabs v-if="data.length > 0" type="card" :editable="true" @delete="handleDelete" :active-key="activeTabKey"
          style="height: calc(100% - 10px)">
          <a-tab-pane v-for="(item, index) of data" :key="item.randomId" :title="item.title" style="height: 100%">
            <div class="sftp-container"
              style="padding-left: 16px; padding-right: 16px; height: 100%; display: flex; flex-direction: column;">
              <div class="path-display">
                <!-- 输入框 -->
                <a-input-group style="width: 100%; margin-bottom: 10px;margin-top: 10px;">
                  <a-button @click="enterDirectoryRoot(item)">
                    <icon-home />
                  </a-button>
                  <a-input v-model="item.currentDirectory" style="width: calc(100% - 32px);"
                    @press-enter="enterDirectoryInput(item)" />
                </a-input-group>
                <!-- 按钮 -->
                <div class="action-buttons" style="margin-bottom: 10px;">
                  <a-button size="small" @click="createFile" type="primary">创建</a-button>
                  <a-button-group size="small" style="margin-left: 10px;">
                    <a-button @click="openUpload(item)">上传</a-button>
                    <a-button @click="copyFile" :disabled="item.selectedRowKeys.length === 0">复制</a-button>
                    <a-button @click="moveFile" :disabled="item.selectedRowKeys.length === 0">移动</a-button>
                    <a-button @click="compressFile" :disabled="item.selectedRowKeys.length === 0">压缩</a-button>
                    <a-button @click="changePermissions" :disabled="item.selectedRowKeys.length === 0">权限</a-button>
                    <a-button @click="deleteFile" :disabled="item.selectedRowKeys.length === 0">删除</a-button>
                    <a-button @click="pasteFile" :disabled="item.copyList.length === 0">粘贴</a-button>
                  </a-button-group>
                </div>
              </div>
              <!-- 列表 -->
              <div style="overflow-y: auto;">
                <a-table :data="item.fileList" :pagination="false" :scroll="{ y: '90%' }" row-key="name"
                  :row-selection="{ type: 'checkbox', showCheckedAll: false, selectedRowKeys: item.selectedRowKeys }"
                  @select="handleRowSelect">
                  <template #columns>
                    <a-table-column title="名称" data-index="name">
                      <template #cell="{ record }">
                        <a-space>
                          <icon-folder v-if="record.type === 'directory'" style="cursor: pointer"
                            @click="enterDirectory(record, item)" />
                          <icon-file v-else />
                          <span v-if="record.type === 'directory'" style="cursor: pointer"
                            @click="enterDirectory(record, item)">{{ record.name }}</span>
                          <span v-else>{{ record.name }}</span>
                        </a-space>
                      </template>
                    </a-table-column>
                    <a-table-column title="大小" data-index="size" />
                    <a-table-column title="修改日期" data-index="modifyDate" />
                    <a-table-column title="权限" data-index="permissions" />
                  </template>
                </a-table>
              </div>

              <!-- 文件上传 -->
              <a-modal v-model:visible="item.showUploadDialog" :hide-title="true" :footer="false" :width="500">
                <a-upload draggable :custom-request="handleUpload" :file-list="item.uploadList" />
                <!-- 进度条 -->
                <a-progress :percent="item.uploadProgress" v-if="item.showProgress" status="active"
                  style="margin-top: 10px;" />
              </a-modal>
            </div>
          </a-tab-pane>
        </a-tabs>
        <!-- 空状态 -->
        <div v-else class="empty-state">
          <icon-computer :style="{ fontSize: '48px', color: '#c2c2c2' }" />
          <p>双击左侧主机节点连接SFTP</p>
        </div>

        <!-- 设置权限弹窗 -->
        <Modal
          v-model:visible="permissionModalVisible"
          @ok="applyPermissions"
          @cancel="permissionModalVisible = false"
          title="设置权限"
        >
          <div style="margin-bottom: 16px;">
            <div>所有者：</div>
            <Checkbox v-model="permissionData.owner.read" @change="updateNumericPermission">读取</Checkbox>
            <Checkbox v-model="permissionData.owner.write" @change="updateNumericPermission">写入</Checkbox>
            <Checkbox v-model="permissionData.owner.execute" @change="updateNumericPermission">执行</Checkbox>
          </div>
          <div style="margin-bottom: 16px;">
            <div>用户组：</div>
            <Checkbox v-model="permissionData.group.read" @change="updateNumericPermission">读取</Checkbox>
            <Checkbox v-model="permissionData.group.write" @change="updateNumericPermission">写入</Checkbox>
            <Checkbox v-model="permissionData.group.execute" @change="updateNumericPermission">执行</Checkbox>
          </div>
          <div style="margin-bottom: 16px;">
            <div>公共：</div>
            <Checkbox v-model="permissionData.others.read" @change="updateNumericPermission">读取</Checkbox>
            <Checkbox v-model="permissionData.others.write" @change="updateNumericPermission">写入</Checkbox>
            <Checkbox v-model="permissionData.others.execute" @change="updateNumericPermission">执行</Checkbox>
          </div>
          <div style="margin-bottom: 16px;">
            <div>权限：<Input v-model="permissionData.numericPermission" style="width: 100px;" /></div>
          </div>
          <div style="margin-bottom: 16px;">
            <div>用户：<Input v-model="permissionData.ownerName" style="width: 200px;" /></div>
          </div>
          <div style="margin-bottom: 16px;">
            <div>用户组：<Input v-model="permissionData.groupName" style="width: 200px;" /></div>
          </div>
          <div>
            <Checkbox v-model="permissionData.applyToSubfiles">同时修改子文件属性</Checkbox>
          </div>
        </Modal>

        <!-- 压缩文件弹窗 -->
        <Modal
          v-model:visible="compressModalVisible"
          @ok="applyCompress"
          @cancel="compressModalVisible = false"
          title="压缩文件"
        >
          <div style="margin-bottom: 16px;">
            <div>压缩格式：</div>
            <a-select v-model="compressData.format" style="width: 100%;">
              <a-option value="zip">zip</a-option>
              <a-option value="tar">tar</a-option>
              <a-option value="tar.gz">tar.gz</a-option>
            </a-select>
          </div>
          <div style="margin-bottom: 16px;">
            <div>压缩文件名：</div>
            <a-row :gutter="8">
              <a-col :span="18">
                <a-input
                  v-model="compressData.name"
                  placeholder="请输入文件名"
                  allow-clear
                >
                  <template #prefix>
                    <icon-file />
                  </template>
                </a-input>
              </a-col>
              <a-col :span="6">
                <a-input
                  disabled
                  readonly
                  v-model="compressData.format"
                >
                </a-input>
              </a-col>
            </a-row>
          </div>
          <div style="margin-bottom: 16px;">
            <div>压缩路径：</div>
            <a-input v-model="compressData.path" placeholder="默认为当前路径" >
              <template #append>
                <a-button @click="selectCompressPath">选择路径</a-button>
              </template>
            </a-input>
          </div>
        </Modal>

        <!-- 选择路径的模态框 -->
        <Modal
          v-model:visible="selectPathModalVisible"
          @ok="confirmSelectPath"
          @cancel="selectPathModalVisible = false"
          title="选择路径"
        >
          <!-- 添加路径导航 -->
          <div style="margin-bottom: 16px;">
            <a-breadcrumb>
              <a-breadcrumb-item>
                <a @click="navigateToRoot">根目录</a>
              </a-breadcrumb-item>
              <a-breadcrumb-item v-for="(segment, index) in pathSegments" :key="index">
                <a @click="navigateToPath(index)">{{ segment }}</a>
              </a-breadcrumb-item>
            </a-breadcrumb>
          </div>

          <a-table :data="selectPathFileList" :pagination="false" :scroll="{ y: '300px' }" row-key="name">
            <template #columns>
              <a-table-column title="名称" data-index="name">
                <template #cell="{ record }">
                  <a-space>
                    <icon-folder style="cursor: pointer" @click="enterSelectPathDirectory(record)" />
                    <span style="cursor: pointer" @click="enterSelectPathDirectory(record)">{{ record.name }}</span>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <div style="margin-top: 16px;">
            <Input v-model="selectedPath" placeholder="当前选择的路径" />
          </div>
        </Modal>
      </div>
    </template>
  </a-split>
</template>
<script setup lang="ts">
import { reactive, ref, h, onMounted, nextTick, computed } from 'vue';
import { IconFolder, IconComputer, IconSettings, IconRefresh, IconHome, IconFile } from '@arco-design/web-vue/es/icon';
import "xterm/css/xterm.css"
import { Message } from '@arco-design/web-vue';
import { Modal, Checkbox, Input, Select } from '@arco-design/web-vue';
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

const permissionModalVisible = ref(false);
const permissionData = reactive({
  owner: {
    read: false,
    write: false,
    execute: false
  },
  group: {
    read: false,
    write: false,
    execute: false
  },
  others: {
    read: false,
    write: false,
    execute: false
  },
  ownerName: '',
  groupName: '',
  numericPermission: '',
  applyToSubfiles: false
});

// 计算属性
const filteredTreeData = computed(() => {
  return searchKeyword.value ? filterTree(treeData.value, searchKeyword.value.toLowerCase()) : treeData.value;
});

// 在 <script setup> 部分添加以下响应式变量
const compressModalVisible = ref(false);
const compressData = reactive({
  format: 'zip',
  name: '',
  path: '',
});

const selectPathModalVisible = ref(false);
const selectPathFileList = ref([]);
const selectedPath = ref('');

// 在 <script setup> 部分添加以下计算属性和方法
const pathSegments = computed(() => {
  return selectedPath.value.split('/').filter(segment => segment !== '');
});

function navigateToRoot() {
  selectedPath.value = '/';
  loadSelectPathFileList('/');
}

function navigateToPath(index) {
  const newPath = '/' + pathSegments.value.slice(0, index + 1).join('/');
  selectedPath.value = newPath;
  loadSelectPathFileList(newPath);
}

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
    getElectronApi().getSftpList({ 'sshId': sshId, 'toPath': dir }).then((res: any) => {
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
        randomId: event.node.key.split("-")[0] + "-" + randomId,
        id: event.node.key,
        title: event.node.title,
        ip: event.node.title,
        fileList: res,
        currentDirectory: dir,
        sshId: sshId,
        selectedRowKeys: [],
        copyList: [],
        copyPath: '',
      });
      activeTabKey.value = event.node.key.split("-")[0] + "-" + randomId
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
  getElectronApi().getSftpList({ 'sshId': sshId, 'toPath': targetPath }).then((res: any) => {
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
  getElectronApi().getSftpList({ 'sshId': item.sshId, 'toPath': item.currentDirectory }).then((res: any) => {
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
    item.selectedRowKeys = []
  })
}

const currentItem: any = ref(null)
function openUpload(item: any) {
  item.uploadList = []
  item.showUploadDialog = true
  currentItem.value = item
}

const handleUpload = async (option: any) => {
  let sshId = activeTabKey.value.split("-")[0]
  const { fileItem, onProgress, onSuccess, onError } = option
  try {
    currentItem.value.showProgress = true
    getElectronApi().onUploadProgress((progress) => {
      // 更新进度条
      currentItem.value.uploadProgress = progress / 100
    });

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

    // 调用 Electron 的主进程来处理文件上传
    const result = await getElectronApi().uploadSftpFile(param)
    // 上传完成
    onProgress({ percent: 100 })
    currentItem.value.showProgress = false
    onSuccess(result)
    // 刷新列表
    enterDirectoryInput(currentItem.value)
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

const handleRowSelect = (selectedRowKeys: string[], selectedRows: any[], info: { selected: boolean; selectedRows: any[]; row: any; }, item: any) => {
  data.value.forEach((item: any) => {
    if (item.randomId === activeTabKey.value) {
      currentItem.value = item
    }
  })

  // 判断是否包含此文件
  if (currentItem.value.selectedRowKeys.includes(info.name)) {
    currentItem.value.selectedRowKeys.splice(currentItem.value.selectedRowKeys.indexOf(info.name), 1);
  } else {
    currentItem.value.selectedRowKeys.push(info.name);
  }
};

async function deleteFile() {
  const confirmResult = await Modal.confirm({
    title: '确认删除',
    content: '您确定要删除选中的文件吗？此操作不可撤销。',
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await getElectronApi().deleteSftpFile(JSON.stringify({
          "sshId": currentItem.value.sshId,
          "path": currentItem.value.currentDirectory,
          "files": currentItem.value.selectedRowKeys
        }));
        currentItem.value.selectedRowKeys = [];
        // 刷新列表
        enterDirectoryInput(currentItem.value);
        // 提示
        Message.success("删除成功");
      } catch (error) {
        Message.error("删除失败：" + error.message);
      }
    }
  });
}

function changePermissions() {
  permissionModalVisible.value = true;
  // 从data列表中获取文件信息
  currentItem.value.fileList.forEach((item: any) => {
    if(item.name === currentItem.value.selectedRowKeys[0]){
    // 将 item.permissions 转换为 permissionData  格式为：0755
    // 将权限字符串转换为数字
    const numericPermission = parseInt(item.permissions, 8);
    
    // 初始化 permissionData
    permissionData.numericPermission = item.permissions.slice(-3);
    
    // ��置所有者权限
    permissionData.owner.read = (numericPermission & 0o400) !== 0;
    permissionData.owner.write = (numericPermission & 0o200) !== 0;
    permissionData.owner.execute = (numericPermission & 0o100) !== 0;
    
    // 设置群组权限
    permissionData.group.read = (numericPermission & 0o040) !== 0;
    permissionData.group.write = (numericPermission & 0o020) !== 0;
    permissionData.group.execute = (numericPermission & 0o010) !== 0;
    
    // 设置其他用户权限
    permissionData.others.read = (numericPermission & 0o004) !== 0;
    permissionData.others.write = (numericPermission & 0o002) !== 0;
    permissionData.others.execute = (numericPermission & 0o001) !== 0;

    // 设置ownerName和groupName
    permissionData.ownerName = item.owner
    permissionData.groupName = item.group
    }
  })
  // 默认勾选
  permissionData.applyToSubfiles = true;
}

function updateNumericPermission() {
  let permission = 0;
  ['owner', 'group', 'others'].forEach((type, index) => {
    let value = 0;
    if (permissionData[type].read) value += 4;
    if (permissionData[type].write) value += 2;
    if (permissionData[type].execute) value += 1;
    permission += value * Math.pow(10, 2 - index);
  });
  permissionData.numericPermission = permission.toString().padStart(3, '0');
}

async function applyPermissions() {
  await getElectronApi().changeSftpFilePermissions(JSON.stringify({
    "sshId": currentItem.value.sshId,
    "path": currentItem.value.currentDirectory,
    "files": currentItem.value.selectedRowKeys,
    "permissions": permissionData.numericPermission,
    "ownerName": permissionData.ownerName,
    "groupName": permissionData.groupName,
    "applyToSubfiles": permissionData.applyToSubfiles
  }))
  // 显示操作成功的提示
  Message.success('权限修改成功');
  permissionModalVisible.value = false;
  // 刷新列表
  enterDirectoryInput(currentItem.value);
}

// 修改 compressFile 函数
function compressFile() {
  compressModalVisible.value = true;
  compressData.name = ''; // 重置名称
  if (currentItem.value.selectedRowKeys.length === 1) {
    let name = currentItem.value.selectedRowKeys[0]
    if(name.startsWith('.')){
      compressData.name = name
    }else if(name.includes('.')){
      compressData.name = name.substring(0, name.lastIndexOf('.'))
    }else{
      compressData.name = name
    }
  }else{
    // 随机
    compressData.name = Math.random().toString(36).substring(2, 15)
  }
  compressData.path = currentItem.value.currentDirectory; // 默认为当前路径
}

// 添加以下函数
async function selectCompressPath() {
  selectPathModalVisible.value = true;
  selectedPath.value = currentItem.value.currentDirectory;
  await loadSelectPathFileList(selectedPath.value);
}

async function loadSelectPathFileList(path) {
  try {
    const res = await getElectronApi().getSftpList({ 'sshId': currentItem.value.sshId, 'toPath': path });
    selectPathFileList.value = res.filter(item => item.type === 'directory').sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    Message.error('加载文件列表失败：' + error.message);
  }
}

async function enterSelectPathDirectory(record) {
  let targetPath = selectedPath.value;
  if (targetPath.endsWith('/')) {
    targetPath += record.name;
  } else {
    targetPath += '/' + record.name;
  }
  selectedPath.value = targetPath;
  await loadSelectPathFileList(targetPath);
}

function confirmSelectPath() {
  compressData.path = selectedPath.value;
  selectPathModalVisible.value = false;
}

async function applyCompress() {
  try {
    await getElectronApi().compressSftpFiles(JSON.stringify({
      sshId: currentItem.value.sshId,
      sourcePath: currentItem.value.currentDirectory,
      files: currentItem.value.selectedRowKeys,
      format: compressData.format,
      name: compressData.name,
      targetPath: compressData.path
    }));
    Message.success('文件压缩成功');
    compressModalVisible.value = false;
    // 刷新列表
    enterDirectoryInput(currentItem.value);
  } catch (error) {
    Message.error('文件压缩失败：' + error.message);
  }
}

async function copyFile() {
  currentItem.value.copyList = currentItem.value.selectedRowKeys
  currentItem.value.copyPath = currentItem.value.currentDirectory
  currentItem.value.selectedRowKeys = []
  Message.success('复制成功')
}

async function pasteFile() {
  if(currentItem.value.copyList.length === 0){
    Message.warning('没有需要粘贴的文件')
    return
  }
  if(currentItem.value.copyPath === currentItem.value.currentDirectory){
    Message.warning('不能粘贴到自身目录')
    return
  }
  let sshId = currentItem.value.sshId
  let sourcePath = currentItem.value.copyPath
  let targetPath = currentItem.value.currentDirectory
  try{
    await getElectronApi().pasteSftpFile(JSON.stringify({
      "sshId": sshId,
    "sourcePath": sourcePath,
    "targetPath": targetPath,
    "files": currentItem.value.copyList
    }))
    Message.success('粘贴成功')
    // 刷新列表
    enterDirectoryInput(currentItem.value)
  }catch(error){
    Message.error('粘贴失败：' + error.message)
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
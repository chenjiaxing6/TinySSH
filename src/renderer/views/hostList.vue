<template>
  <a-split :style="{
        height: '100%',
        width: '100%',
        minWidth: '500px',
      }"
           v-model:size="size"
           min="80px"
  >
    <!--主机列表-->
    <template #first>
      <div class="tree-container">
        <div style="background-color: rgb(242, 242, 242);height: 100%;padding: 8px">
          <div @contextmenu.prevent="onContextMenu">
            <a-tree :data="filteredTreeData" @select="handleSelect" :selected-keys="selectedKeys">
            </a-tree>
            <div v-if="showContextMenu"
                 :style="{ position: 'fixed', top: `${menuY}px`, left: `${menuX}px` }"
                 class="context-menu">
              <a-menu>
                <a-menu-item @click="onMenuItemClick('add')">添加文件夹</a-menu-item>
                <a-menu-item @click="onMenuItemClick('edit')">编辑</a-menu-item>
                <a-menu-item @click="onMenuItemClick('delete')">删除</a-menu-item>
              </a-menu>
            </div>
          </div>
        </div>
        <div class="tree-footer" style="display: flex; align-items: center; justify-content: space-between; padding: 8px;">
          <a-input-search
            v-model="searchKeyword"
            placeholder="筛选"
            style="width: calc(100% - 70px); height: 24px;"
            size="mini"
            @input="handleSearch"
          />
          <div>
            <a-button shape="circle" size="mini" style="margin-left: 8px;" @click="openCreateFolder">
              <icon-folder />
            </a-button>
            <a-button shape="circle" size="mini" style="margin-left: 8px;" @click="openCreateHost">
              <icon-computer />
            </a-button>
          </div>
        </div>
      </div>
    </template>

    <!--终-->
    <template #second>
      <div class="tab-container">
        <a-tabs type="card" :editable="true" @delete="handleDelete" :active-key="activeTabKey" @change="handleTabChange" style="height: 100%">
          <a-tab-pane v-for="(item, index) of data" :key="item.randomId" :title="item.title" style="height: 100%">
            <div class="terminal-wrapper">
              <div :ref="el => setTerminalRef(el, item.id)" class="terminal-container"></div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </template>
  </a-split>

  <a-modal
    v-model:visible="createFolderVisible"
    title="添加文件夹"
    @ok="handleFolderOk"
    @cancel="handleFolderCancel"
  >
    <a-form :model="folderForm" :style="{ maxWidth: '500px' }">
      <a-form-item field="parentFolder" label="上级文件夹">
        <a-tree-select
          v-model="folderForm.parentFolder"
          :data="folderTreeData"
          placeholder="请选择上级文件夹(不选择为根节点)"
          allow-clear
        />
      </a-form-item>
      <a-form-item field="folderName" label="文件夹名称">
        <a-input v-model="folderForm.folderName" placeholder="请输入文件夹名称" />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- 添加主机对话框 -->
  <a-modal
    v-model:visible="createHostVisible"
    title="添加主机"
    @ok="handleHostOk"
    @cancel="handleHostCancel"
  >
    <a-form :model="hostForm" :style="{ maxWidth: '500px' }">
      <a-form-item field="parentFolder" label="上级文件夹">
        <a-tree-select
          v-model="hostForm.parentFolder"
          :data="folderTreeData"
          placeholder="请选择上级文件夹"
        />
      </a-form-item>
      <a-form-item field="name" label="主机名称">
        <a-input v-model="hostForm.name" placeholder="请输入主机名称" />
      </a-form-item>
      <a-form-item field="ip" label="IP地址">
        <a-input v-model="hostForm.ip" placeholder="请输入IP地址" />
      </a-form-item>
      <a-form-item field="port" label="端口">
        <a-input-number v-model="hostForm.port" placeholder="请输入端口号" :min="1" :max="65535" />
      </a-form-item>
      <a-form-item field="username" label="用户名">
        <a-input v-model="hostForm.username" placeholder="请输入用户名" />
      </a-form-item>
      <a-form-item field="password" label="密码">
        <a-input-password v-model="hostForm.password" placeholder="请输入密码" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import {reactive, ref, h, onMounted, nextTick, computed} from 'vue';
import {IconFolder, IconComputer, IconSettings} from '@arco-design/web-vue/es/icon';
import {Terminal} from "xterm"
import {FitAddon} from 'xterm-addon-fit'
import "xterm/css/xterm.css"
import {AttachAddon} from "xterm-addon-attach";
import { Message, Modal, Popconfirm } from '@arco-design/web-vue';

// 定义响应式数据
const size = ref(0.25);
const terminalRefs: any = ref({});
const createFolderVisible = ref(false);
const createHostVisible = ref(false);
const showContextMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const selectedNode = ref(null);
const selectedKeys = ref([]);
const searchKeyword = ref('');
const treeData = ref([]);
let count = 5;
const data: any = ref([]);
const activeTabKey = ref<string | null>(null);

// 表单数据
const folderForm = reactive({
  parentFolder: '',
  folderName: '',
});

const hostForm = reactive({
  parentFolder: '',
  name: '',
  ip: '',
  port: 22,
  username: '',
  password: '',
});

// 添加新的响应式变量
const isEditing = ref(false);
const editingItemId = ref(null);

// 计算属性
const filteredTreeData = computed(() => {
  return searchKeyword.value ? filterTree(treeData.value, searchKeyword.value.toLowerCase()) : treeData.value;
});

const folderTreeData = computed(() => {
  return treeData.value.filter(node => node.type === 'folder').map(folder => ({
    key: folder.key,
    title: folder.title,
    icon:() => h(IconFolder),
    children: folder.children ? folder.children.filter(child => child.type === 'folder') : []
  }));
});

// 方法
function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

function handleSelect(keys: any, event: any) {
  selectedNode.value = event.node;
  selectedKeys.value = keys;
  if (event.node.type === 'ssh') {
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    getElectronApi().getPort(randomId).then((port: any) => {
      getElectronApi().enableWs(randomId,event.node.sshId);
      data.value.push({
        randomId:randomId,
        id: event.node.key,
        title: event.node.title,
        ip: event.node.title
      });
      activeTabKey.value = randomId

      nextTick(() => {
        let terminal = null;
        let fitAddon = null;
        let socket = null;

        socket = new WebSocket(`ws://127.0.0.1:${port}/${event.node.sshId}`);
        terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        });

        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        terminal.open(terminalRefs.value[`terminalContainer${event.node.key}`]);
        fitAddon.fit();

        window.onresize = function () {
          fitAddon.fit();
        };

        let attachAddon = new AttachAddon(socket);
        terminal.loadAddon(attachAddon);
      });
    });
  }
}

// 右键菜单
function onContextMenu(event: any) {
  const {__vueParentComponent: parent} = event.target;
  selectedKeys.value = []
  if (parent.attrs.type === 'ssh') {
    selectedKeys.value.push(parent.attrs.sshId + '-' + parent.attrs.type);
  } else {
    selectedKeys.value.push(parent.attrs.id + '-' + parent.attrs.type);
  }
  selectedNode.value = parent.attrs;
  event.preventDefault();
  showContextMenu.value = true;
  menuX.value = event.clientX;
  menuY.value = event.clientY;
}

function onMenuItemClick(action: any) {
  if (selectedNode.value) {
    switch (action) {
      case 'add':
        if (selectedNode.value.type === 'ssh') {
          Message.error('请选择文件夹');
          return;
        }
        folderForm.parentFolder = selectedNode.value.id+"-folder";
        openCreateFolder();
        break;
      case 'edit':
        isEditing.value = true;
        if (selectedNode.value.type === 'folder') {
          editingItemId.value = selectedNode.value.id;
          folderForm.folderName = selectedNode.value.folderName
          folderForm.parentFolder = selectedNode.value.parentId ? selectedNode.value.parentId + "-folder" : '';
          openCreateFolder();
        } else {
          editingItemId.value = selectedNode.value.sshId;
          hostForm.name = selectedNode.value.sshName;
          hostForm.ip = selectedNode.value.ip;
          // 转为num
          hostForm.port = Number(selectedNode.value.port);
          hostForm.username = selectedNode.value.userName;
          hostForm.password = ''; // 出于安全考虑,不回显密码
          hostForm.parentFolder = selectedNode.value.folderId + "-folder";
          openCreateHost();
        }
        break;
      case 'delete':
        if (selectedNode.value.type === 'folder') {
          deleteFolderAndHost(selectedNode.value);
        } else {
          deleteSsh(selectedNode.value.sshId);
        }
        break;
    }
  }
  showContextMenu.value = false;
}

// 文件夹相关
function setTerminalRef(el, id) {
  if (el) {
    terminalRefs.value[`terminalContainer${id}`] = el
  }
}

function openCreateFolder() {
  createFolderVisible.value = true;
}

function resetFolderForm() {
  folderForm.parentFolder = '';
  folderForm.folderName = '';
  isEditing.value = false;
  editingItemId.value = null;
}

function handleFolderOk() {
  folderForm.parentFolder = folderForm.parentFolder.replace('-folder', '');
  if (!folderForm.folderName.trim()) {
    Message.error('请输入文件夹名称');
    return;
  }
  if (isEditing.value) {
    getElectronApi().updateFolder({
      id: editingItemId.value,
      parentFolder: folderForm.parentFolder,
      folderName: folderForm.folderName
    }).then(() => {
      createFolderVisible.value = false;
      getTreeData();
      Message.success('文件夹更新成功');
      resetFolderForm();
      isEditing.value = false;
      editingItemId.value = null;
    }).catch((error: Error) => {
      console.error('更新文件夹失败:', error);
      Message.error('更新文件夹失败，请重试');
    });
  } else {
    getElectronApi().createFolder({
      parentFolder: folderForm.parentFolder,
      folderName: folderForm.folderName
    }).then(() => {
      createFolderVisible.value = false;
      getTreeData();
      Message.success('文件夹创建成功');
      resetFolderForm();
    }).catch((error: Error) => {
      console.error('创建文件夹失败:', error);
      Message.error('创建文件夹失败，请重试');
    });
  }
}

function handleFolderCancel() {
  createFolderVisible.value = false;
  resetFolderForm();
}

// 搜索过滤
function filterTree(nodes, keyword) {
  if (!keyword) {
    return nodes;
  }
  return nodes.filter(node => {
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

function handleSearch() {
  if (!searchKeyword.value) {
    getTreeData();
  }
}

// tab相关
function handleDelete(key: any) {
  data.value = data.value.filter(item => item.randomId !== key)
}

// 添加一个新的方法来处理标签页切换
function handleTabChange(key: string) {
  activeTabKey.value = key;
}

// 列表相关
function getTreeData() {
  getElectronApi().getTreeInfo().then(res => {
    res.forEach(addIconToProps);
    console.log(res);
    treeData.value = res;
  })
}

function addIconToProps(node) {
  if (node.type === 'folder') {
    node.icon = () => h(IconFolder);
  } else if (node.type === 'ssh') {
    node.icon = () => h(IconComputer);
  }
  if (node.children) {
    node.children.forEach(addIconToProps);
  }
}

function openCreateHost() {
  if (!isEditing.value) {
    resetHostForm();
  }
  createHostVisible.value = true;
}

function handleHostOk() {
  if (!hostForm.name.trim() || !hostForm.ip.trim() || !hostForm.username.trim() || (!isEditing.value && !hostForm.password.trim())) {
    Message.error('请填写所有必填字段');
    return;
  }
  
  // IP地址验证
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(hostForm.ip)) {
    Message.error('请输入有效的IP地址');
    return;
  }
  
  // 端口验证
  if (hostForm.port < 1 || hostForm.port > 65535) {
    Message.error('请输入有效的端口号(1-65535)');
    return;
  }
  
  hostForm.parentFolder = hostForm.parentFolder.replace('-folder', '');
  
  if (isEditing.value) {
    getElectronApi().updateSsh({
      id: editingItemId.value,
      parentFolder: hostForm.parentFolder,
      name: hostForm.name,
      ip: hostForm.ip,
      port: hostForm.port,
      username: hostForm.username,
      password: hostForm.password
    }).then(() => {
      createHostVisible.value = false;
      getTreeData();
      Message.success('SSH主机更新成功');
      resetHostForm();
      isEditing.value = false;
      editingItemId.value = null;
    }).catch((error: Error) => {
      console.error('更新SSH主机失败:', error);
      Message.error('更新SSH主机失败，请重试');
    });
  } else {
    getElectronApi().createSsh({
      parentFolder: hostForm.parentFolder,
      name: hostForm.name,
      ip: hostForm.ip,
      port: hostForm.port,
      username: hostForm.username,
      password: hostForm.password
    }).then(() => {
      createHostVisible.value = false;
      getTreeData();
      Message.success('SSH主机添加成功');
      resetHostForm();
    }).catch((error: Error) => {
      console.error('添加SSH主机失败:', error);
      Message.error('添加SSH主机失败，请重试');
    });
  }
}

function resetHostForm() {
  hostForm.parentFolder = '';
  hostForm.name = '';
  hostForm.ip = '';
  hostForm.port = 22;
  hostForm.username = '';
  hostForm.password = '';
  isEditing.value = false;
  editingItemId.value = null;
}

function handleHostCancel() {
  createHostVisible.value = false;
  isEditing.value = false;
}

function deleteFolderAndHost(node: any) {
  if(node.type === 'folder') {
    Modal.confirm({
      title: '确认删除',
      content: '确定删除该文件夹及其所有子节点吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        getElectronApi().deleteFolder(node.id).then(() => {
          getTreeData();
          Message.success('删除文件夹成功');
        }).catch((error: Error) => {
          console.error('删除文件夹失败:', error);
          Message.error('删除文件夹失败，请重试');
        });
      },
    });
  } else if(node.type === 'ssh') {
    // 处理SSH节点的删除逻辑
  }
}

// 添加 deleteSsh 函数
function deleteSsh(sshId: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定删除该SSH主机吗？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      getElectronApi().deleteSsh(sshId).then(() => {
        getTreeData();
        Message.success('删除SSH主机成功');
      }).catch((error: Error) => {
        console.error('删除SSH主机失败:', error);
        Message.error('删除SSH主机失败，请重试');
      });
    },
  });
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
}

.terminal-wrapper {
  background-color: red;
  width: 100%;
  height: 95%;
}

.terminal-container {
  width: 100%;
  height: 100%;
}

.tab-container {
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
</style>
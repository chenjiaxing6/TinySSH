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
                <a-menu-item @click="onMenuItemClick('add')">添加</a-menu-item>
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

    <!--终端-->
    <template #second>
      <div class="tab-container">
        <a-tabs type="card" :editable="true" @add="handleAdd" @delete="handleDelete" style="height: 100%">
          <a-tab-pane v-for="(item, index) of data" :key="item.id" :title="item.id" style="height: 100%">
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
import {
  IconMenuFold,
  IconMenuUnfold,
  IconApps,
  IconPlus,
  IconStorage,
  IconImport,
  IconExport
} from '@arco-design/web-vue/es/icon';
import {IconFolder, IconComputer, IconSettings} from '@arco-design/web-vue/es/icon';
import {Terminal} from "xterm"
import {FitAddon} from 'xterm-addon-fit'
import "xterm/css/xterm.css"
import {AttachAddon} from "xterm-addon-attach";

const terminalContainer = ref(null);
const terminalRefs: any = ref({})

function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

// 点击树节点
const handleSelect = (keys: any, event: any) => {
  selectedNode.value = event.node;
  if (event.node.type === 'ssh') {
    // 生成一个随机ID
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    getElectronApi().getPort(randomId).then((port: any) => {
      console.log(port);

      getElectronApi().enableWs(randomId,event.node.sshId);
      data.value.push({
        id: event.node.key,
        title: event.node.title,
        ip: event.node.title
      });

      nextTick(() => {

        let terminal = null;
        let fitAddon = null;
        let socket = null;

        // 创建WebSocket连接
        socket = new WebSocket(`ws://127.0.0.1:${port}/${event.node.sshId}`); // 假设WebSocket服务器在8080端口
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

        // 监听键盘输入
        let attachAddon = new AttachAddon(socket);
        terminal.loadAddon(attachAddon);
      });
    });
  }
};

const setTerminalRef = (el, id) => {
  if (el) {
    terminalRefs.value[`terminalContainer${id}`] = el
  }
}

const createFolderVisible = ref(false);
const folderForm = reactive({
  parentFolder: '',
  folderName: '',
});

function openCreateFolder() {
  createFolderVisible.value = true;
}

function handleFolderOk() {
  if (!folderForm.folderName.trim()) {
    // 显示错误提示
    return;
  }
  
  getElectronApi().createFolder({
    parentFolder: folderForm.parentFolder,
    folderName: folderForm.folderName
  }).then(() => {
    createFolderVisible.value = false;
    getTreeData(); // 刷新树形数据
    // 重置表单
    folderForm.parentFolder = '';
    folderForm.folderName = '';
  }).catch(error => {
    console.error('创建文件夹失败:', error);
    // 这里可以添加错误提示
  });
}

function handleFolderCancel() {
  createFolderVisible.value = false;
  // 重置表单
  folderForm.parentFolder = '';
  folderForm.folderName = '';
}

// 右键菜单
const showContextMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const selectedNode = ref(null);
const selectedKeys = ref([]);
const onContextMenu = (event: any) => {
  const {__vueParentComponent: parent} = event.target;
  console.log(parent.attrs);
  selectedKeys.value = []
  if (parent.attrs.type === 'ssh') {
    selectedKeys.value.push(parent.attrs.sshId + '-' + parent.attrs.type);
  } else {
    selectedKeys.value.push(parent.attrs.id + '-' + parent.attrs.type);
  }
  event.preventDefault();
  showContextMenu.value = true;
  menuX.value = event.clientX;
  menuY.value = event.clientY;
};
const onMenuItemClick = (action: any) => {
  if (selectedNode.value) {
    console.log(`Performing ${action} on node:`, selectedNode.value);
    // 在这里实现相应的操作逻辑
  }
  showContextMenu.value = false;
};

// 点击其他地方时隐藏右键菜单
document.addEventListener('click', () => {
  showContextMenu.value = false;
});


onMounted(() => {
  getTreeData()
})

let count = 5;
const data: any = ref([]);

const searchKeyword = ref('');
const filteredTreeData = computed(() => {
  return searchKeyword.value ? filterTree(treeData.value, searchKeyword.value.toLowerCase()) : treeData.value;
});

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
  // 当搜索关键词为空时,重新获取树形数据
  if (!searchKeyword.value) {
    getTreeData();
  }
}

const handleAdd = () => {
  const number = count++;
  data.value = data.value.concat({
    key: `${number}`,
    title: `New Tab ${number}`,
    content: `Content of New Tab Panel ${number}`
  })
};
const handleDelete = (key: any) => {
  data.value = data.value.filter(item => item.id !== key)
};

const treeData = ref([]);
// 定义响应式数据
const size = ref(0.25);

const createHostVisible = ref(false);
const hostForm = reactive({
  parentFolder: '',
  name: '',
  ip: '',
  port: 22,
  username: '',
  password: '',
});

const folderTreeData = computed(() => {
  return treeData.value.filter(node => node.type === 'folder').map(folder => ({
    key: folder.key,
    title: folder.title,
    children: folder.children ? folder.children.filter(child => child.type === 'folder') : []
  }));
});

function openCreateHost() {
  createHostVisible.value = true;
}

function handleHostOk() {
  // 这里添加创建主机的逻辑
  // getElectronApi().createHost(hostForm).then(() => {
  //   createHostVisible.value = false;
  //   getTreeData(); // 刷新树形数据
  // }).catch(error => {
  //   console.error('创建主机失败:', error);
  //   // 这里可以添加错误提示
  // });
}

function handleHostCancel() {
  createHostVisible.value = false;
}

function getTreeData() {
  getElectronApi().getTreeInfo().then(res => {
    //设置图标
    res.forEach(addIconToProps);
    treeData.value = res;
    treeData.value = res;
  })
}

const addIconToProps = (node) => {
  if (node.type === 'folder') {
    node.icon = () => h(IconFolder);
  } else if (node.type === 'ssh') {
    node.icon = () => h(IconComputer);
  }
  if (node.children) {
    node.children.forEach(addIconToProps);
  }
};

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
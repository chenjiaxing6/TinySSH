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
            <a-tree :data="treeData" @select="handleSelect" :selected-keys="selectedKeys">
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
        <div class="tree-footer">
          <a-button shape="circle" size="mini">
            <icon-plus/>
          </a-button>
          <a-button shape="circle" size="mini" @click="openCreateFolder">
            <icon-folder/>
          </a-button>
          <a-button shape="circle" size="mini">
            <icon-import/>
          </a-button>
          <a-button shape="circle" size="mini">
            <icon-export/>
          </a-button>
        </div>
      </div>
    </template>

    <!--终端-->
    <template #second>
      <div class="tab-container">
        <a-tabs
            type="card"
            :editable="true"
            @delete="handleDelete"
            style="height: 100%"
            v-model:activeKey="activeTabKey"
        >
          <a-tab-pane v-for="(item, index) of data" :key="item.key" :title="item.title" style="height: 100%">
            <div class="terminal-wrapper">
              <div :ref="el => setTerminalRef(el, item.id)" class="terminal-container"></div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </template>
  </a-split>

  <a-modal
      width="300px"
      v-model:visible="createFolderVisiable"
      title="添加文件夹"
      @ok="handleFolderOk"
      @cancel="handleFolderCancel"
  >
    <a-form :model="folderForm">
      <a-input
          v-model="folderForm.folderName"
          placeholder="请输入文件夹名称"
          readonly
      >
      </a-input>
    </a-form>
  </a-modal>
</template>
<script setup lang="ts">
import {reactive, ref, h, onMounted, nextTick} from 'vue';
import {
  IconMenuFold,
  IconMenuUnfold,
  IconApps,
  IconPlus,
  IconStorage,
  IconImport,
  IconExport
} from '@arco-design/web-vue/es/icon';
import {IconFolder, IconComputer} from '@arco-design/web-vue/es/icon';
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

const activeTabKey = ref('');
// 点击树节点
const handleSelect = (keys: any, event: any) => {
  selectedNode.value = event.node;
  if (event.node.type === 'ssh') {
    // 生成一个随机ID
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    getElectronApi().getPort(randomId).then((port: any) => {
      getElectronApi().enableWs(randomId, event.node.sshId);
      data.value.push({
        key:randomId,
        id: event.node.key,
        title: event.node.title,
        ip: event.node.title
      });
      activeTabKey.value = randomId;

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

const createFolderVisiable = ref(false);
const folderForm = reactive({
  folderName: '',
});

function handleFolderOk() {
  createFolderVisiable.value = false;
}

function handleFolderCancel() {
  createFolderVisiable.value = false;
}

function openCreateFolder() {
  // createFolderVisiable.value = true;
  // getElectronApi().createFolder("hello ");
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

const handleDelete = (key: any) => {
  data.value = data.value.filter(item => item.key !== key)
};

const treeData = ref([]);
// 定义响应式数据
const size = ref(0.25);


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
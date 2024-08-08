<template>
  <div class="layout-container">
    <!-- 左侧菜单 -->
    <div class="menu-container">
      <a-menu
          collapsed="collapsed"
          :style="{ width: '200px', height: '84%' }"
      >
        <a-menu-item key="1">
          <template #icon>
            <icon-storage></icon-storage>
          </template>
          主机列表
        </a-menu-item>
      </a-menu>
      <div style="padding: 6px">
        <a-button shape="circle">
          <icon-settings/>
        </a-button>
      </div>
      <div style="padding: 6px">
        <a-button shape="circle" @click="onOpenDevTools">
          <icon-github/>
        </a-button>
      </div>
    </div>
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
            <a-tree :data="treeData" @select="handleSelect">
              <template #icon>
                <IconFolder/>
              </template>
            </a-tree>
          </div>
          <div class="tree-footer">
            <a-button shape="circle" size="mini">
              <icon-plus/>
            </a-button>
            <a-button shape="circle" size="mini">
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
          <a-tabs type="card" :editable="true" @add="handleAdd" @delete="handleDelete" style="height: 100%">
            <a-tab-pane v-for="(item, index) of data" :key="item.id" :title="item.id" style="height: 100%">
              <div class="terminal-wrapper">
                <div :ref="el => setTerminalRef(el, item.id)" class="terminal-container"></div>
              </div>
            </a-tab-pane>
          </a-tabs>
<!--          <a-tabs default-active-key="1" style="height: 100%" type="card-gutter">-->
<!--            <a-tab-pane key="1" title="Tab 1" style="height: 100%">-->
<!--              <div class="terminal-wrapper">-->
<!--                <div ref="terminalContainer" class="terminal-container"></div>-->
<!--              </div>-->
<!--            </a-tab-pane>-->
<!--          </a-tabs>-->
        </div>
      </template>
    </a-split>
  </div>
</template>
<script setup>
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
import utils from "@utils/renderer";
import {IconFolder, IconComputer} from '@arco-design/web-vue/es/icon';
import {IconSettings, IconGithub} from '@arco-design/web-vue/es/icon';

import {Terminal} from "xterm"
import {FitAddon} from 'xterm-addon-fit'
import "xterm/css/xterm.css"
import { AttachAddon } from "xterm-addon-attach";

const terminalContainer = ref(null);
const terminalRefs = ref({})
const setTerminalRef = (el, id) => {
  if (el) {
    terminalRefs.value[`terminalContainer${id}`] = el
  }
}

onMounted(()=>{

})

let count = 5;
const data = ref([]);

function onOpenDevTools() {
  utils.openDevTools();
}

const handleAdd = () => {
  const number = count++;
  data.value = data.value.concat({
    key: `${number}`,
    title: `New Tab ${number}`,
    content: `Content of New Tab Panel ${number}`
  })
};
const handleDelete = (key) => {
  data.value = data.value.filter(item => item.id !== key)
};

const treeData = [
  {
    title: '分组1',
    key: 'node1',
    children: [
      {
        title: '分组1-1',
        key: '分组1-1',
      },
    ],
  },
  {
    title: '分组2',
    key: 'node3',
    children: [
      {
        title: '192.168.0.101',
        key: '192.168.0.101',
        icon: () => h(IconComputer),
      },
      {
        title: '192.168.0.102',
        key: '192.168.0.102',
        icon: () => h(IconComputer),
      },
    ],
  },
  {
    title: '192.168.0.103',
    key: '192.168.0.103',
    icon: () => h(IconComputer),
  },
];
const handleSelect = (keys, event) => {
  getElectronApi().enableWs();
  data.value.push({
    id: event.node.key,
    title: event.node.title,
    ip: event.node.title
  });

  nextTick(() => {
    let terminal = null;
    let currentLine = '';
    let fitAddon = null;
    let socket = null;

    // 创建WebSocket连接
    socket = new WebSocket(`ws://127.0.0.1:8080`); // 假设WebSocket服务器在8080端口
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
};
// 定义响应式数据
const size = ref(0.25);

function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

getElectronApi().onShowClosePrimaryWinMsgbox(() => {
  getElectronApi().asyncExitApp();
});
</script>
<style scoped>
.layout-container {
  display: flex;
  height: 100vh; /* 使容器占满整个视口高度 */
}

.menu-container {
  flex-shrink: 0; /* 防止菜单被压缩 */
}

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
:deep(.terminal){
  height: 100%;
}
</style>

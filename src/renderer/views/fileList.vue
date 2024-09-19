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
          @change="handleTabChange" style="height: calc(100% - 40px)">
          <a-tab-pane v-for="(item, index) of data" :key="item.randomId" :title="item.title" style="height: 100%">
            <div class="sftp-container" style="padding-left: 16px; padding-right: 16px;">
              <div class="path-display">
                <a-input-group style="width: 100%; margin-bottom: 10px;margin-top: 10px;">
                  <a-button>
                    <icon-home />
                  </a-button>
                  <a-input v-model="currentDirectory" readonly style="width: calc(100% - 32px);" />
                </a-input-group>
                <div class="action-buttons" style="margin-bottom: 10px;">
                  <a-button size="small" @click="createFile" type="primary">创建</a-button>
                  <a-button-group size="small">
                    <a-button @click="uploadFile">上传</a-button>
                    <a-button @click="copyFile">复制</a-button>
                    <a-button @click="moveFile">移动</a-button>
                    <a-button @click="compressFile">压缩</a-button>
                    <a-button @click="changePermissions">权限</a-button>
                    <a-button @click="deleteFile">删除</a-button>
                  </a-button-group>
                </div>
              </div>
              <a-table :data="fileList" :pagination="false">
                <template #columns>
                  <a-table-column title="名称" data-index="name">
                    <template #cell="{ record }">
                      <icon-folder v-if="record.type === 'directory'" />
                      <icon-file v-else />
                      {{ record.name }}
                    </template>
                  </a-table-column>
                  <a-table-column title="大小" data-index="size" />
                  <a-table-column title="修改日期" data-index="modifiedDate" />
                  <a-table-column title="操作">
                    <template #cell="{ record }">
                      <a-button v-if="record.type === 'directory'" @click="enterDirectory(record.name)">进入</a-button>
                      <a-button v-else @click="downloadFile(record.name)">下载</a-button>
                    </template>
                  </a-table-column>
                </template>
              </a-table>
            </div>
          </a-tab-pane>
        </a-tabs>
        <div v-else class="empty-state">
          <icon-computer :style="{ fontSize: '48px', color: '#c2c2c2' }" />
          <p>双击左侧主机节点连接SFTP</p>
        </div>
      </div>
    </template>
  </a-split>
</template>
<script setup lang="ts">
import { reactive, ref, h, onMounted, nextTick, computed } from 'vue';
import { IconFolder, IconComputer, IconSettings, IconRefresh,IconHome } from '@arco-design/web-vue/es/icon';
import "xterm/css/xterm.css"
import { Message } from '@arco-design/web-vue';
// 定义响应式数据
const size = ref(0.25);
const showContextMenu = ref(false);
const selectedNode: any = ref(null);
const selectedKeys = ref([]);
const searchKeyword = ref('');
const treeData = ref([]);
const data: any = ref([]);
const activeTabKey = ref<string | null>(null);
const currentPath = ref([]);
const fileList = ref([]);

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

function openSSH(event: any) {
  if (event.node.type === 'ssh') {
    const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    data.value.push({
      randomId: randomId,
      id: event.node.key,
      title: event.node.title,
      ip: event.node.title
    });
  }
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
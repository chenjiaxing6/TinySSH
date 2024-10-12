<template>
  <div class="layout-container">
    <!-- 左侧菜单 -->
    <div class="menu-container">
      <a-menu
          collapsed="collapsed"
          :default-selected-keys="['1']"
          :style="{ width: '200px', height: '84%' }"
      >
        <router-link to="/primary">
          <a-menu-item key="1">
            <template #icon>
              <icon-storage></icon-storage>
            </template>
            主机列表
          </a-menu-item>
        </router-link>
        <router-link to="/primary/fileList">
          <a-menu-item key="2">
            <template #icon>
              <icon-folder></icon-folder>
            </template>
            文件管理
          </a-menu-item>
        </router-link>
      </a-menu>
      <div style="position: fixed; bottom: 7px; left: 10px; display: flex; flex-direction: column; gap: 10px;">
        <a-tooltip content="上传数据">
          <a-button shape="circle" @click="handleUploadData">
            <a-spin v-if="isUploading"></a-spin>
            <icon-upload v-if="!isUploading"/>
          </a-button>
        </a-tooltip>
        <a-tooltip content="下载数据">
          <a-button shape="circle" @click="handleDownloadData">
            <icon-download/>
          </a-button>
        </a-tooltip>
        <a-button shape="circle" @click="onOpenDevTools">
          <icon-github/>
        </a-button>
        <a-button shape="circle" @click="openSettings">
          <icon-settings/>
        </a-button>
      </div>
    </div>
    <!-- 右侧内容 -->
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <Settings ref="settingsRef" />
  </div>
</template>
<script setup>
import utils from "@utils/renderer";
import {IconSettings, IconGithub,IconFolder,IconUpload,IconDownload} from '@arco-design/web-vue/es/icon';
import {
  IconMenuFold,
  IconMenuUnfold,
  IconApps,
  IconPlus,
  IconStorage,
  IconImport,
  IconExport
} from '@arco-design/web-vue/es/icon';
import Settings from '../components/Settings.vue';
import {ref} from "vue";
import { Message } from "@arco-design/web-vue";

function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

getElectronApi().onShowClosePrimaryWinMsgbox(() => {
  getElectronApi().asyncExitApp();
});

getElectronApi().onShowExitAppMsgbox(() => {
  getElectronApi().asyncExitApp();
});

const settingsRef = ref(null);

function openSettings() {
  settingsRef.value.show();
}

async function handleUploadData() {
  isUploading.value = true
  const res = await getElectronApi().asyncUploadData();
  if (res.success) {
    Message.success('数据上传成功');
    isUploading.value = false
  } else {
    Message.error('数据上传失败: ' + res.message);
    isUploading.value = false
  }
}

import { useStatusStore } from '../store/status'
import { storeToRefs } from 'pinia'
const statusStore = useStatusStore()
const { isLoading } = storeToRefs(statusStore)
const isUploading = ref(false)

async function handleDownloadData() {
  statusStore.setStatus('exec')
  const res = await getElectronApi().asyncDownloadData();
  if (res.success) {
    Message.success('数据下载成功');
    statusStore.setStatus('done')
  } else {
    Message.error('数据下载失败: ' + res.message);
    statusStore.setStatus('done')
  }
}

function onOpenDevTools() {
  utils.openDevTools();
}
</script>
<style scoped>
.layout-container {
  display: flex;
  height: 100vh; /* 使容器占满整个视口高度 */
}

.menu-container {
  flex-shrink: 0; /* 防止菜单被压缩 */
}
</style>

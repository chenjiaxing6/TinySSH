<template>
  <a-layout class="sftp-manager">
    <a-layout-sider width="250px">
      <div class="server-list">
        <h3>SFTP 服务器</h3>
        <a-select
            v-model="selectedServer"
            placeholder="选择服务器"
            style="width: 100%"
            @change="handleServerChange"
        >
          <a-option v-for="server in servers" :key="server.id" :value="server.id">
            {{ server.name }}
          </a-option>
        </a-select>
        <a-button type="primary" style="margin-top: 10px; width: 100%" @click="handleAddServer">
          添加服务器
        </a-button>
      </div>
    </a-layout-sider>
    <a-layout-content>
      <div class="file-list-container">
        <div class="action-bar">
          <a-space>
            <a-button type="primary" @click="handleUpload">
              <template #icon><icon-upload /></template>
              上传
            </a-button>
            <a-button @click="handleNewFolder">
              <template #icon><icon-folder-add /></template>
              新建文件夹
            </a-button>
            <a-input-search
                placeholder="搜索文件"
                style="width: 200px"
                @search="handleSearch"
            />
          </a-space>
        </div>
        <a-table :columns="columns" :data="fileData" :pagination="false" :scroll="{ y: 'calc(100vh - 180px)' }">
          <template #name="{ record }">
            <a-space>
              <icon-file v-if="record.type === 'file'" />
              <icon-folder v-else :style="{ color: '#FFD700' }" />
              {{ record.name }}
            </a-space>
          </template>
          <template #operations="{ record }">
            <a-space>
              <a-button type="text" size="small" @click="handleDownload(record)">
                <icon-download />
              </a-button>
              <a-button type="text" size="small" @click="handleEdit(record)">
                <icon-edit />
              </a-button>
              <a-button type="text" size="small" status="danger" @click="handleDelete(record)">
                <icon-delete />
              </a-button>
            </a-space>
          </template>
        </a-table>
      </div>
    </a-layout-content>
  </a-layout>
</template>

<script>
import { defineComponent, ref } from 'vue';
import {
  IconFile,
  IconFolder,
  IconUpload,
  IconFolderAdd,
  IconDownload,
  IconEdit,
  IconDelete
} from '@arco-design/web-vue/es/icon';

export default defineComponent({
  components: {
    IconFile,
    IconFolder,
    IconUpload,
    IconFolderAdd,
    IconDownload,
    IconEdit,
    IconDelete,
  },
  setup() {
    const columns = [
      {
        title: '名称',
        dataIndex: 'name',
        slotName: 'name',
      },
      {
        title: '大小',
        dataIndex: 'size',
      },
      {
        title: '修改日期',
        dataIndex: 'modifiedDate',
      },
      {
        title: '权限',
        dataIndex: 'permissions',
      },
      {
        title: '操作',
        slotName: 'operations',
        width: 120,
        align: 'center',
      },
    ];

    const fileData = ref([
      { name: 'document.txt', type: 'file', size: '10 KB', modifiedDate: '2023-05-20 10:30', permissions: 'rw-r--r--' },
      { name: 'images', type: 'folder', size: '-', modifiedDate: '2023-05-19 15:45', permissions: 'drwxr-xr-x' },
      { name: 'project.zip', type: 'file', size: '1.5 MB', modifiedDate: '2023-05-18 09:00', permissions: 'rw-r--r--' },
      { name: 'config.json', type: 'file', size: '2 KB', modifiedDate: '2023-05-17 14:20', permissions: 'rw-r--r--' },
      { name: 'backup', type: 'folder', size: '-', modifiedDate: '2023-05-16 11:10', permissions: 'drwxr-xr-x' },
    ]);

    const servers = ref([
      { id: 1, name: 'Server 1' },
      { id: 2, name: 'Server 2' },
      { id: 3, name: 'Server 3' },
    ]);

    const selectedServer = ref(null);

    const handleUpload = () => {
      console.log('Upload clicked');
    };

    const handleNewFolder = () => {
      console.log('New folder clicked');
    };

    const handleSearch = (value) => {
      console.log('Search:', value);
    };

    const handleServerChange = (serverId) => {
      console.log('Selected server:', serverId);
      // 这里你可以添加加载选定服务器文件的逻辑
    };

    const handleAddServer = () => {
      console.log('Add server clicked');
      // 这里你可以添加打开添加服务器对话框的逻辑
    };

    const handleDownload = (record) => {
      console.log('Download:', record.name);
    };

    const handleEdit = (record) => {
      console.log('Edit:', record.name);
    };

    const handleDelete = (record) => {
      console.log('Delete:', record.name);
    };

    return {
      columns,
      fileData,
      servers,
      selectedServer,
      handleUpload,
      handleNewFolder,
      handleSearch,
      handleServerChange,
      handleAddServer,
      handleDownload,
      handleEdit,
      handleDelete,
    };
  },
});
</script>

<style scoped>
.sftp-manager {
  height: 100vh;
}

.server-list {
  padding: 16px;
}

.file-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-bar {
  padding: 10px;
  background-color: #f5f5f5;
}
</style>
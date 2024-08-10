<template>
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
    <a-table :columns="columns" :data="fileData" :pagination="false" :scroll="{ y: 'calc(100% - 50px)' }">
      <template #name="{ record }">
        <a-space>
          <icon-file v-if="record.type === 'file'" />
          <icon-folder v-else :style="{ color: '#FFD700' }" />
          {{ record.name }}
        </a-space>
      </template>
      <template #operations>
        <a-space>
          <a-button type="text" size="small">
            <icon-download />
          </a-button>
          <a-button type="text" size="small">
            <icon-edit />
          </a-button>
          <a-button type="text" size="small" status="danger">
            <icon-delete />
          </a-button>
        </a-space>
      </template>
    </a-table>
  </div>
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

    const handleUpload = () => {
      console.log('Upload clicked');
    };

    const handleNewFolder = () => {
      console.log('New folder clicked');
    };

    const handleSearch = (value) => {
      console.log('Search:', value);
    };

    return {
      columns,
      fileData,
      handleUpload,
      handleNewFolder,
      handleSearch,
    };
  },
});
</script>

<style scoped>
.file-list-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.action-bar {
  padding: 10px;
  background-color: #f5f5f5;
}
</style>
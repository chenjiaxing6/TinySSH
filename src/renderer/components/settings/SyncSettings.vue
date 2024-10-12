<template>
    <div>
      <a-form :model="syncForm">
        <a-form-item field="method" label="同步方式">
          <a-select v-model="syncForm.method" placeholder="请选择同步方式">
            <a-option value="s3">S3对象存储</a-option>
            <a-option value="webdav">WebDAV</a-option>
            <!-- 可以在此添加其他同步方式选项 -->
          </a-select>
        </a-form-item>

        <!-- S3对象存储相关设置 -->
        <template v-if="syncForm.method === 's3'">
          <a-form-item field="s3.endpoint" label="服务地址(Endpoint)">
            <a-input v-model="syncForm.s3.endpoint" placeholder="请输入S3服务地址" />
          </a-form-item>
          <a-form-item field="s3.region" label="区域(Region)">
            <a-input v-model="syncForm.s3.region" placeholder="请输入S3区域" />
          </a-form-item>
          <a-form-item field="s3.accessKeyId" label="Access Key ID">
            <a-input v-model="syncForm.s3.accessKeyId" placeholder="请输入Access Key ID" />
          </a-form-item>
          <a-form-item field="s3.secretAccessKey" label="Secret Access Key">
            <a-input-password v-model="syncForm.s3.secretAccessKey" placeholder="请输入Secret Access Key" />
          </a-form-item>
          <a-form-item field="s3.bucket" label="存储桶(Bucket)">
            <a-input v-model="syncForm.s3.bucket" placeholder="请输入S3存储桶名称" />
          </a-form-item>
        </template>

        <!-- WebDAV相关设置 -->
        <template v-if="syncForm.method === 'webdav'">
          <a-form-item field="webdav.url" label="WebDAV服务地址">
            <a-input v-model="syncForm.webdav.url" placeholder="请输入WebDAV服务地址" />
          </a-form-item>
          <a-form-item field="webdav.username" label="用户名">
            <a-input v-model="syncForm.webdav.username" placeholder="请输入WebDAV用户名" />
          </a-form-item>
          <a-form-item field="webdav.password" label="密码">
            <a-input-password v-model="syncForm.webdav.password" placeholder="请输入WebDAV密码" />
          </a-form-item>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="saveSettings">保存设置</a-button>
            <a-button @click="testConnection">快速测试</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>
</template>

<script setup lang="ts">
import { inject, onMounted, reactive } from 'vue'
import { Message } from '@arco-design/web-vue'

function getElectronApi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.primaryWindowAPI;
}

const syncForm: any = reactive({
  method: '',
  s3: {
    endpoint: '',
    region: '',
    accessKeyId: '',
    secretAccessKey: '',
    bucket: ''
  },
  webdav: {
    url: '',
    username: '',
    password: ''
  }
})

const saveSettings = () => {
  console.log('保存同步设置:', syncForm)
  getElectronApi().saveSyncSettings(JSON.stringify(syncForm)).then((res: any) => {
    if (res.success) {
      Message.success('设置已保存')
    } else {
      Message.error('设置保存失败: ' + res.message)
    }
  })
}

const testConnection = () => {
  Message.info('正在测试连接...')
  getElectronApi().testWebDav(JSON.stringify(syncForm)).then((res: any) => {
    if (res.success) {
      Message.success('连接测试成功')
    } else {
      Message.error('连接测试失败: ' + res.message)
    }
  })
}

const initSyncSettings:any = inject('initSyncSettings')
const loadSyncSettings = async () => {
  console.log('进入同步设置页面')
  // 先清空
  syncForm.method = ''
  syncForm.s3 = {}
  syncForm.webdav = {}

  const res = await getElectronApi().getConfig("syncMethod")
  console.log('同步方法配置:', res)
  if (res && res.length > 0) {
    syncForm.method = res[0].value
    loadConfigDetail(syncForm.method)
  }
}

const loadConfigDetail = async (method: string) => {
  const config = await getElectronApi().getConfig(method)
  console.log('同步方法配置:', config)
  if (config && config.length > 0) {
    config.forEach((item: any) => {
      // 添加空值检查
      if (item.value !== null && item.value !== undefined) {
        syncForm[method][item.key] = item.value
      }
    })
  }
}
if (initSyncSettings) {
  initSyncSettings.value = loadSyncSettings
}
</script>

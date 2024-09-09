<template>
  <a-modal
    v-model:visible="visible"
    title="设置"
    @cancel="handleCancel"
    :footer="null"
    width="600px"
  >
    <a-layout style="height: 400px;">
      <a-layout-sider width="150px" style="background: #fff">
        <a-menu
          mode="vertical"
          :selected-keys="[activeKey]"
          @menu-item-click="handleSelect"
          style="height: 100%"
        >
          <a-menu-item key="general">
            <template #icon><icon-settings /></template>
            通用设置
          </a-menu-item>
          <a-menu-item key="appearance">
            <template #icon><icon-skin /></template>
            外观设置
          </a-menu-item>
          <a-menu-item key="advanced">
            <template #icon><icon-bulb /></template>
            高级设置
          </a-menu-item>
        </a-menu>
      </a-layout-sider>
      <a-layout-content style="padding: 0 24px">
        <component :is="currentSettingComponent"></component>
      </a-layout-content>
    </a-layout>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import { IconSettings, IconSkin, IconBulb } from '@arco-design/web-vue/es/icon';
import GeneralSettings from './settings/GeneralSettings.vue';
import AppearanceSettings from './settings/AppearanceSettings.vue';
import AdvancedSettings from './settings/AdvancedSettings.vue';

const visible = ref(false);
const activeKey = ref('general');
const currentSettingComponent = shallowRef(GeneralSettings);

const handleSelect = (key) => {
  activeKey.value = key;
  switch (key) {
    case 'general':
      currentSettingComponent.value = GeneralSettings;
      break;
    case 'appearance':
      currentSettingComponent.value = AppearanceSettings;
      break;
    case 'advanced':
      currentSettingComponent.value = AdvancedSettings;
      break;
  }
};

const handleCancel = () => {
  visible.value = false;
};

defineExpose({
  show: () => {
    visible.value = true;
  }
});
</script>
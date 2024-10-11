import { createApp } from "vue";
import "./style.css";
import { createPinia } from 'pinia'

// 导入 FontAwesome 图标
import { library as fontAwesomeLibrary } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { fas } from "@fortawesome/free-solid-svg-icons"; // solid样式图标
fontAwesomeLibrary.add(fas);

import App from "./App.vue";
import '@arco-design/web-vue/dist/arco.css';
import ArcoVue from '@arco-design/web-vue';
import router from "./router";

const app = createApp(App);
const pinia = createPinia()

app.use(ArcoVue);
app.use(router);
app.use(pinia);
app.component("FontAwesomeIcon", FontAwesomeIcon);
app.mount("#app");

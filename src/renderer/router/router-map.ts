import {RouteRecordRaw} from "vue-router";

// 定义路由规则
const routeMap: Array<RouteRecordRaw> = [
    {
        path: "/primary",
        name: "primary",
        component: () => import("@views/primary.vue"),
        children: [
            {
                path: "",
                name: "host-list",
                component: () => import("@views/hostList.vue"),
            },
            {
                path: "fileList",
                name: "file-list",
                component: () => import("@views/fileList.vue"),
            },
            {
                path: "quickCommands",
                name: "quick-commands",
                component: () => import("@views/command.vue"),
            },
        ]
    },
    {
        path: "/frameless-sample",
        name: "frameless-sample",
        component: () => import("@views/frameless-sample.vue"),
    }
];

export default routeMap;
# SleepCare 智能睡眠健康管理软件

> 一款面向个人用户与医生的智能睡眠环境调控与健康管理小程序，配套云端 API 与医生端 Web 后台。

---

## 一、项目简介

SleepCare 帮助用户记录睡眠数据、生成睡眠报告、管理智能设备、设置个性化作息，并支持向授权医生开放睡眠数据，接收医生的干预建议。

**核心功能模块**：

- 用户注册 / 登录（患者 / 医生角色）
- 设备管理（添加 / 解绑 / 修改虚拟设备）
- 睡眠报告（日 / 周 / 月趋势，分期图、噪音曲线）
- 个性化设置（作息计划、勿扰时段）
- 医生授权与干预建议
- 医生端 Web 后台（登录、患者列表、报告查看、建议填写）

---

## 二、技术架构

| 层级 | 技术栈 |
|------|--------|
| 小程序端 | 原生微信小程序 + ECharts |
| 后端 API | Node.js + Express |
| 数据库 | SQLite（开发）/ MySQL（生产） |
| 医生端 Web | HTML + JavaScript + ECharts（静态页面） |
| 部署 | Docker + PM2 + Nginx（可选） |

---

## 三、快速开始

### 1. 克隆项目

```bash
git clone <仓库地址>
cd sleep-care
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
```

服务默认启动在 `http://localhost:3000`。

### 3. 运行集成测试

确保后端已启动，然后执行：

```bash
node backend/test/integration.test.js
```

### 4. 导入并运行微信小程序

使用微信开发者工具打开项目根目录，点击「编译」即可预览。

---

## 四、API 文档索引

详细接口定义请查看：

- `docs/api.yaml` — OpenAPI 3.0 规范
- `SleepCare_API.postman_collection.json` — Postman 测试集合

主要接口分组：

| 分组 | 路径前缀 |
|------|----------|
| 认证 | `/api/v1/auth` |
| 设备 | `/api/v1/devices` |
| 睡眠报告 | `/api/sleep/report` |
| 作息设置 | `/api/setting` |
| 医生授权 | `/api/doctor` |
| 用户 | `/api/users` |

---

## 五、目录结构

```
sleep-care/
├── backend/              # 后端服务
│   ├── app.js            # Express 主入口
│   ├── db/               # 数据库连接与表结构
│   ├── middleware/       # 认证等中间件
│   ├── public/           # 医生端 Web 静态页面
│   ├── routes/           # API 路由
│   ├── test/             # 集成测试脚本
│   └── package.json
├── pages/                # 微信小程序页面（主目录）
├── miniprogram/          # 微信小程序备用目录
├── docs/                 # 文档
│   ├── api.yaml          # OpenAPI 文档
│   ├── migration.sql     # MySQL 迁移脚本
│   ├── migrate-data.js   # 数据迁移脚本
│   ├── 医患通知方案设计.md
│   └── 硬件对接方案.md
├── README.md             # 本文件
└── sleep_care.db         # SQLite 数据库文件
```

---

## 六、开发团队

- 项目指导：实训教师
- 开发者：周灿
- 开发周期：2026-06 ~ 2026-07

---

## 七、许可证

本项目仅用于教学实训，未经许可不得用于商业用途。

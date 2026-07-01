# CloudBase 云托管部署指南（第13大节）

> 本文档指导使用腾讯云 CloudBase 免费环境完成 SleepCare 后端部署，并接入 CloudBase MySQL 实现数据持久化。

## 一、前置准备

1. 腾讯云账号（QQ/微信/企业微信均可登录）
2. 已安装 Git 的本地开发环境
3. 已阅读 `docs/migration.sql` 和 `docs/migrate-data.js`
4. 项目代码已提交到本地 Git（并计划打标签 `v1.0-final`）

## 二、创建 CloudBase 环境

1. 访问 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 点击「新建环境」或「立即创建并使用」
3. 环境名称：`sleep-care`（可自定义）
4. 套餐选择：**免费体验版**
5. 记录顶部显示的 **环境 ID**（如 `sleep-care-xxxxx`）

## 三、开通 MySQL 数据库

1. 在控制台 → 数据库 → MySQL 数据库 → 点击「开通」
2. 选择 **免费版**
3. 记录连接信息：
   - 内网地址：以 `mysql://...` 或域名形式给出的 **内网地址**（小租户必须在云托管中开启私有网络才能访问）
   - 外网地址：仅在本地调试时开启（会产生流量费）
   - 端口：`3306`
   - 用户名：`root` 或创建的用户
   - 密码：创建时设置的密码
   - 数据库名：`sleep_care`

## 四、导入表结构

方式 A：使用 CloudBase SQL 编辑器（推荐）
1. 进入 CloudBase 控制台 → 数据库 → MySQL 数据库 → SQL 编辑器
2. 复制 `docs/migration-cloudbase.sql` 中的语句
3. 注意：CloudBase SQL 编辑器一次只能执行一条语句，请按文件中的注释逐条执行
4. 预期看到 5 张表：`users`, `devices`, `sleep_reports`, `user_settings`, `doctor_authorizations`

方式 B：使用 DMC 管理工具
1. 进入 CloudBase 控制台 → 数据库 → DMC 管理
2. 选择 `sleep_care` 数据库
3. 点击「悬浮工具」→「导入导出」→「数据导入」
4. 选择本地文件 `docs/migration-cloudbase.sql`
5. 执行导入

验证表结构：
```sql
USE sleep_care;
SHOW TABLES;
```

## 五、部署后端到云托管

1. 进入控制台 → 云托管
2. 点击「新建服务」或「绑定 GitHub 仓库部署」
3. 服务名称：`sleepcare-api`
4. 部署方式：「GitHub 仓库」或「本地代码部署」
   - 本地代码部署：选择项目根目录（包含 `Dockerfile` 和 `backend` 目录），端口填 `3000`
   - GitHub 部署：绑定仓库，选择 `main` 分支，构建命令用 `Dockerfile`（已内置）
5. 点击「创建并部署」，等待 3-5 分钟
6. 部署完成后，服务详情页会显示**公网访问地址**（如 `https://xxx.app.tcloudbase.com`）

> 第12/13大节项目使用 `Dockerfile` 构建，无需额外构建命令。

## 六、配置环境变量（切换到 MySQL）

在云托管服务详情页 → 服务配置 → 环境变量，添加以下 JSON（注意：代码读取的是 `DB_HOST` 等变量，不是 `MYSQL_HOST`）：

```json
{
  "PORT": "3000",
  "DATABASE_TYPE": "mysql",
  "DB_HOST": "your-mysql-internal-host",
  "DB_PORT": "3306",
  "DB_USER": "root",
  "DB_PASSWORD": "your-password",
  "DB_NAME": "sleep_care",
  "JWT_SECRET": "sleep-care-secret-key-2026"
}
```

> 注意：CloudBase 内网连接时，请使用 MySQL 的 **内网地址**。如果连接地址显示为 `172.17.0.2` 等 Docker 桥接 IP，且云托管无法访问，请检查并开启私有网络（见第七节）。

保存后点击「部署」，服务会自动重启。

## 七、配置私有网络（关键！小租户必须）

**如果你的 MySQL 是 CloudBase 小租户免费版，云托管容器默认无法访问 MySQL 内网地址，必须手动开启私有网络：**

1. 进入 CloudBase 控制台 → 云托管 → 服务管理 → 点击 `sleepcare-api`
2. 切换到 **服务配置** 页
3. 找到 **网络配置** 区域
4. 开启 **「私有网络」** 开关
5. 在下拉框中选择 **MySQL 数据库所在的 VPC/子网**（通常与数据库创建时选择的私有网络一致）
6. 点击 **保存** 或 **部署**
7. 等待 2-3 分钟让配置生效

> 开启私有网络后，云托管容器才能通过内网地址访问 MySQL。未开启时会出现 `Error: connect ETIMEDOUT` 错误。

## 八、设置最小实例数（避免冷启动 503）

CloudBase 免费版默认最小实例数为 0，首次请求会触发冷启动，导致 503 或请求超时。建议：

1. 进入服务详情 → 服务配置 → 副本配置
2. 将 **最小副本数** 从 `0` 改为 `1`
3. 点击 **部署** 按钮
4. 等待 2-3 分钟

> 最小实例数为 1 后，服务会常驻 1 个容器，不再因冷启动超时。免费版可能产生少量费用，但可确保演示稳定。

## 九、验证部署

1. 浏览器访问公网地址：`https://xxx.app.tcloudbase.com/`
2. 预期返回 JSON：

```json
{"code":0,"message":"SleepCare API 服务运行中","data":{"name":"SleepCare Backend","version":"1.0.0"}}
```

3. 使用 Postman 测试注册/登录（见 `docs/第13大节截图指南.md`）
4. 在 DMC 中查询新注册用户，确认数据已持久化到 MySQL

## 十、小程序切换线上 API

修改 `utils/config.js` 和 `miniprogram/utils/config.js` 中的 `BASE_URL`：

```javascript
// 开发环境
// const BASE_URL = 'http://localhost:3000';

// 线上环境（CloudBase）
const BASE_URL = 'https://xxx.app.tcloudbase.com';
```

在微信开发者工具中：
1. 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
2. 点击「预览」生成二维码，手机扫码测试

> 正式发布需配置 request 合法域名，默认域名（`.app.tcloudbase.com`）不支持备案，仅限测试。

## 十一、持久化验证（关键验收点）

1. 小程序或 Postman 注册新账号
2. 在 DMC 中查询 `SELECT * FROM users WHERE phone='xxx'` 确认存在
3. 在云托管控制台重启服务
4. 再次登录该账号，确认成功
5. 再次查询 MySQL，确认数据仍在

## 十二、常见问题

**Q: 容器启动后日志显示数据库连接失败 / `ETIMEDOUT`？**
A: 按顺序检查：
   1. 是否已开启云托管服务的「私有网络」并选择正确的 VPC；
   2. 环境变量 `DB_HOST` 是否为 MySQL 的 **内网地址**；
   3. 用户名、密码、数据库名是否正确；
   4. 安全组是否放行 3306 端口。

**Q: 数据库表不存在？**
A: 确认已通过 CloudBase SQL 编辑器或 DMC 导入 `docs/migration-cloudbase.sql`。注意 SQL 编辑器一次只能执行一条语句。

**Q: 提示 `Cannot find module 'mysql2/promise'`？**
A: 确认 `backend/package.json` 的 `dependencies` 中已包含 `mysql2`（第13大节已修复）。提交并推送后重新部署。

**Q: 小程序请求失败 / 返回 503？**
A: 检查是否设置最小实例数为 1；检查是否勾选「不校验合法域名」；检查 `baseUrl` 是否以 `https://` 开头。

**Q: 默认域名访问报 `INVALID_HOST`？**
A: CloudBase 默认域名需要在「HTTP 网关」中创建路由。进入 HTTP 网关 → 新建路由 → 路径填 `/` → 选择 `sleepcare-api` 服务 → 保存，使用网关分配的域名访问。

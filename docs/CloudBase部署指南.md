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
   - 内网地址：`xxx.mysql.tencentsdb.com`（推荐，云托管容器内网访问免费）
   - 外网地址：仅在本地调试时开启（会产生流量费）
   - 端口：`3306`
   - 用户名：`root` 或创建的用户
   - 密码：创建时设置的密码
   - 数据库名：`sleep_care`

## 四、导入表结构

方式 A：使用 DMC 管理工具
1. 进入 CloudBase 控制台 → 数据库 → DMC 管理
2. 选择 `sleep_care` 数据库
3. 点击「悬浮工具」→「导入导出」→「数据导入」
4. 选择本地文件 `docs/migration.sql`
5. 执行导入

方式 B：使用本地 MySQL 客户端
```bash
mysql -h your-host -P 3306 -u root -p sleep_care < docs/migration.sql
```

验证表结构：
```sql
USE sleep_care;
SHOW TABLES;
```

预期看到 5 张表：`users`, `devices`, `sleep_reports`, `user_settings`, `doctor_authorizations`。

## 五、部署后端到云托管

1. 进入控制台 → 云托管
2. 点击「新建服务」或「通过本地代码部署」
3. 服务名称：`sleep-care-api`
4. 部署方式：「本地代码部署」→「文件夹」
5. 选择项目根目录（包含 `Dockerfile` 和 `backend` 目录）
6. 端口填写：`3000`
7. 点击「创建并部署」，等待 3-5 分钟
8. 部署完成后，服务详情页会显示**公网访问地址**（如 `https://xxx.app.tcloudbase.com`）

## 六、配置环境变量（切换到 MySQL）

在云托管服务详情页 → 服务配置 → 环境变量，添加以下 JSON：

```json
{
  "PORT": "3000",
  "DATABASE_TYPE": "mysql",
  "MYSQL_HOST": "your-mysql-host",
  "MYSQL_PORT": "3306",
  "MYSQL_USER": "root",
  "MYSQL_PASSWORD": "your-password",
  "MYSQL_DATABASE": "sleep_care",
  "JWT_SECRET": "sleep-care-secret-key-2026"
}
```

> 注意：CloudBase 内网连接时，请使用 MySQL 的**内网地址**。

保存后点击「更新版本」，服务会自动重启。

## 七、验证部署

1. 浏览器访问公网地址：`https://xxx.app.tcloudbase.com/`
2. 预期返回 JSON：

```json
{"code":0,"message":"SleepCare API 服务运行中","data":{"name":"SleepCare Backend","version":"1.0.0"}}
```

3. 使用 Postman 测试注册/登录（见 `docs/第13大节截图指南.md`）
4. 在 DMC 中查询新注册用户，确认数据已持久化到 MySQL

## 八、小程序切换线上 API

修改 `utils/config.js` 或 `app.js` 中的 `baseUrl`：

```javascript
// 开发环境
// baseUrl: 'http://localhost:3000'

// 线上环境（CloudBase）
baseUrl: 'https://xxx.app.tcloudbase.com'
```

在微信开发者工具中：
1. 勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」
2. 点击「预览」生成二维码，手机扫码测试

> 正式发布需配置 request 合法域名，默认域名（`.app.tcloudbase.com`）不支持备案，仅限测试。

## 九、持久化验证（关键验收点）

1. 小程序或 Postman 注册新账号
2. 在 DMC 中查询 `SELECT * FROM users WHERE phone='xxx'` 确认存在
3. 在云托管控制台重启服务
4. 再次登录该账号，确认成功
5. 再次查询 MySQL，确认数据仍在

## 十、常见问题

**Q: 容器启动后日志显示数据库连接失败？**
A: 检查环境变量中的 `MYSQL_HOST` 是否为内网地址；安全组是否放行 3306 端口；用户名密码是否正确。

**Q: 数据库表不存在？**
A: 确认已通过 DMC 导入 `docs/migration.sql`。

**Q: 小程序请求失败？**
A: 检查是否勾选「不校验合法域名」；检查 `baseUrl` 是否以 `https://` 开头。

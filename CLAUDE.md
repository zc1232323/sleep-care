# CLAUDE.md — 智能睡眠健康管理软件

> 本项目为"智能睡眠健康管理软件（SleepCare）"课程项目。本文档定义项目全部规范，AI 助手和开发者均须遵守。

---

## 一、技术栈规范

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 前端 | Vue 3 + TypeScript + Vant UI | 移动端 H5，兼容微信内嵌浏览器 |
| 后端 | Node.js + Express / Koa | RESTful API 服务 |
| 数据库 | MySQL 8.0 | 关系型数据库，UTF-8mb4 字符集 |
| 缓存 | Redis | 会话管理、热点数据缓存 |
| 存储 | 腾讯云 COS / 阿里云 OSS | 用户头像、报告文件 |
| 部署 | Docker + Nginx | 容器化部署，反向代理 |

---

## 二、数据库规范

1. **命名规范**
   - 表名：小写 + 下划线（snake_case），复数形式，如 `users`、`sleep_reports`
   - 字段名：小写 + 下划线，如 `user_id`、`created_at`
   - 主键：统一使用 `id`，类型 `BIGINT UNSIGNED AUTO_INCREMENT`
   - 索引命名：`idx_表名_字段名`，唯一索引 `uk_表名_字段名`

2. **必备字段**
   每张表必须包含以下字段：
   - `id` — 主键
   - `created_at` — 创建时间（DEFAULT CURRENT_TIMESTAMP）
   - `updated_at` — 更新时间（ON UPDATE CURRENT_TIMESTAMP）
   - `is_deleted` — 软删除标记（TINYINT DEFAULT 0）

3. **字符集与存储引擎**
   - 全部使用 `InnoDB` 引擎
   - 字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`

4. **外键策略**
   - 开发阶段使用逻辑外键（应用层维护引用完整性）
   - 生产环境可考虑物理外键

---

## 三、API 规范

1. **URL 设计**
   - RESTful 风格：`/api/v1/{resource}` / `/api/v1/{resource}/{id}`
   - 资源名用复数，小写 + 连字符

2. **请求格式**
   - `Content-Type: application/json`
   - 认证：`Authorization: Bearer <token>`

3. **响应格式**
   ```json
   {
     "code": 0,
     "message": "success",
     "data": {}
   }
   ```

4. **HTTP 状态码**
   - 200 成功
   - 201 创建成功
   - 400 参数错误
   - 401 未认证
   - 403 无权限
   - 404 资源不存在
   - 500 服务器错误

5. **分页规范**
   - 请求参数：`page`（页码，从 1 开始）、`page_size`（每页条数，默认 20）
   - 响应包含：`list`、`total`、`page`、`page_size`

---

## 四、代码规范

1. **通用规范**
   - 使用 ESLint + Prettier 统一代码风格
   - 缩进：2 空格
   - 行尾：LF
   - 字符串：优先使用单引号

2. **命名规范**
   - 变量/函数：camelCase
   - 类/组件：PascalCase
   - 常量：UPPER_SNAKE_CASE
   - 文件名：kebab-case

3. **Git 提交**
   - 格式：`<type>(<scope>): <subject>`
   - type：feat / fix / docs / style / refactor / test / chore
   - subject 使用中文，简洁明了

---

## 五、注释规范

1. **文件头注释**
   ```javascript
   /**
    * @file 文件功能描述
    * @author 作者
    * @date YYYY-MM-DD
    */
   ```

2. **函数注释（JSDoc）**
   ```javascript
   /**
    * 函数功能描述
    * @param {Type} paramName - 参数说明
    * @returns {Type} 返回值说明
    */
   ```

3. **接口注释**
   ```javascript
   /**
    * @api {method} /path 接口说明
    * @apiName 接口名称
    * @apiGroup 接口分组
    * @apiParam {Type} param 参数说明
    * @apiSuccess {Type} field 返回字段说明
    */
   ```

4. **原则**
   - 复杂业务逻辑必须注释
   - 避免无意义注释（如 `// i++`）
   - 注释与代码同步更新

---

## 六、AI 行为规范

1. **代码生成**
   - 生成代码必须符合本项目全部规范
   - 优先复用已有工具函数和组件
   - 涉及数据库操作必须考虑 SQL 注入防护

2. **文件操作**
   - 新建文件前确认是否已有类似功能模块
   - 不随意删除或修改非自己创建的文件
   - 保持项目目录结构整洁

3. **安全要求**
   - 不在代码中硬编码密钥、密码
   - 所有用户输入必须做校验和净化
   - API 接口涉及敏感数据必须鉴权

4. **沟通原则**
   - 提供可执行的解决方案，而非泛泛建议
   - 修改代码后主动说明改动原因
   - 发现潜在问题及时提醒

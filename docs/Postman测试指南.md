# Postman 完整测试指南

> SleepCare 项目所有接口的测试填写汇总
> 按顺序测试即可完成全部验收

---

## 一、接口清单总览

| # | 接口 | Method | URL | 需要 Body | 需要 Token |
|---|------|--------|-----|-----------|-----------|
| 1 | 健康检查 | GET | `http://localhost:3000/` | ❌ | ❌ |
| 2 | 用户注册 | POST | `http://localhost:3000/api/v1/auth/register` | ✅ | ❌ |
| 3 | 用户登录 | POST | `http://localhost:3000/api/v1/auth/login` | ✅ | ❌ |
| 4 | 获取设备列表 | GET | `http://localhost:3000/api/v1/devices/list` | ❌ | ✅ |
| 5 | 添加虚拟设备 | POST | `http://localhost:3000/api/v1/devices/add` | ✅ | ✅ |
| 6 | 修改设备昵称 | PUT | `http://localhost:3000/api/v1/devices/{id}` | ✅ | ✅ |
| 7 | 删除设备 | DELETE | `http://localhost:3000/api/v1/devices/{id}` | ❌ | ✅ |
| 8 | 获取睡眠报告 | GET | `http://localhost:3000/api/sleep/report/daily` | ❌ | ✅ |

---

## 二、Postman 通用设置

### Body 标签页设置（适用于所有 POST/PUT 请求）
1. 勾选 **`raw`** 单选框
2. 右下角下拉框选择 **`JSON`**（不是 Text！）
3. 粘贴对应接口的 JSON 内容

### Authorization 标签页设置（适用于需要 Token 的接口）
1. TYPE 下拉框选择 **`Bearer Token`**
2. Token 框粘贴登录返回的 token 值（不带 "Bearer " 前缀）

---

## 三、各接口详细填写内容

### 接口 1：健康检查（测试服务器是否启动）

```
Method: GET
URL:    http://localhost:3000/
Body:   不填
Token:  不需要
```

**预期响应：**
```json
{
  "code": 0,
  "message": "SleepCare API 服务运行中",
  "data": {
    "name": "SleepCare Backend",
    "version": "1.0.0"
  }
}
```

---

### 接口 2：用户注册

```
Method: POST
URL:    http://localhost:3000/api/v1/auth/register
Body:   填以下 JSON
Token:  不需要
```

**Body 内容：**
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

**预期响应：**
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "id": 1,
    "phone": "13800138000",
    "nickname": "用户8000",
    "role": "patient"
  }
}
```

**错误场景测试：**

| 测试 | Body 内容 | 预期响应 |
|------|----------|---------|
| 重复注册 | `{"phone":"13800138000","password":"123456"}` | `"该手机号已注册"` |
| 密码太短 | `{"phone":"13800138001","password":"12345"}` | `"密码长度不能少于6位"` |
| 手机号格式错 | `{"phone":"1380","password":"123456"}` | `"手机号必须是11位数字"` |
| 空字段 | `{"phone":"","password":""}` | `"手机号和密码不能为空"` |

---

### 接口 3：用户登录（获取 Token）

```
Method: POST
URL:    http://localhost:3000/api/v1/auth/login
Body:   填以下 JSON
Token:  不需要
```

**Body 内容：**
```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

**预期响应：**
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "id": 1,
    "phone": "13800138000",
    "nickname": "用户8000",
    "role": "patient"
  }
}
```

> ⚠️ **重要：复制 `token` 的值，后面所有接口都要用到！**

**错误场景测试：**

| 测试 | Body 内容 | 预期响应 |
|------|----------|---------|
| 密码错误 | `{"phone":"13800138000","password":"wrong"}` | `"密码错误"` |
| 未注册手机号 | `{"phone":"13999999999","password":"123456"}` | `"用户不存在，请先注册"` |

---

### 接口 4：获取设备列表

```
Method: GET
URL:    http://localhost:3000/api/v1/devices/list
Body:   不填
Token:  需要（在 Authorization 标签填 Bearer Token）
```

**预期响应（首次为空）：**
```json
{
  "code": 0,
  "message": "success",
  "data": []
}
```

**预期响应（添加设备后）：**
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "serial_no": "VIRCjcmetbJsnsL2F6H",
      "user_id": 1,
      "nickname": "我的设备",
      "is_virtual": 1,
      "online_status": 1,
      "created_at": "2026-06-29 14:01:08",
      "updated_at": "2026-06-29 14:01:08"
    }
  ]
}
```

---

### 接口 5：添加虚拟设备

```
Method: POST
URL:    http://localhost:3000/api/v1/devices/add
Body:   填以下 JSON
Token:  需要
```

**Body 内容（方式一：自动生成虚拟设备）：**
```json
{
  "is_virtual": true
}
```

**Body 内容（方式二：手动输入序列号）：**
```json
{
  "device_serial": "ABC123def456GHI7",
  "is_virtual": false
}
```
> 注：device_serial 必须是 16 位字母数字

**预期响应：**
```json
{
  "code": 0,
  "message": "添加成功",
  "data": {
    "id": 1,
    "serial_no": "VIRCjcmetbJsnsL2F6H",
    "user_id": 1,
    "nickname": "我的设备",
    "is_virtual": 1,
    "online_status": 1,
    "created_at": "2026-06-29 14:01:08",
    "updated_at": "2026-06-29 14:01:08"
  }
}
```

---

### 接口 6：修改设备昵称

```
Method: PUT
URL:    http://localhost:3000/api/v1/devices/1
        （最后的 1 是设备 id，从接口5返回或接口4列表中获取）
Body:   填以下 JSON
Token:  需要
```

**Body 内容：**
```json
{
  "nickname": "我的睡眠仪"
}
```

**预期响应：**
```json
{
  "code": 0,
  "message": "修改成功",
  "data": {
    "id": 1,
    "serial_no": "VIRCjcmetbJsnsL2F6H",
    "user_id": 1,
    "nickname": "我的睡眠仪",
    "is_virtual": 1,
    "online_status": 1,
    "created_at": "2026-06-29 14:01:08",
    "updated_at": "2026-06-29 14:05:00"
  }
}
```

---

### 接口 7：删除设备

```
Method: DELETE
URL:    http://localhost:3000/api/v1/devices/1
        （最后的 1 是设备 id）
Body:   不填
Token:  需要
```

**预期响应：**
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

### 接口 8：获取每日睡眠报告（核心）

```
Method: GET
URL:    http://localhost:3000/api/sleep/report/daily?date=2026-06-28
        （date 参数可选，不传默认查昨天的数据）
Body:   不填
Token:  需要
Params: Key=date, Value=2026-06-28
```

**Params 标签页填写：**

| Key | Value |
|-----|-------|
| `date` | `2026-06-28` |

**预期响应（首次请求，会生成数据）：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "user_id": 1,
    "device_id": 1,
    "report_date": "2026-06-28",
    "sleep_score": 81,
    "total_sleep_minutes": 438,
    "deep_sleep_minutes": 71,
    "light_sleep_minutes": 263,
    "rem_sleep_minutes": 104,
    "awake_minutes": 7,
    "awake_count": 4,
    "heart_rate_json": [
      {"time": "22:30", "bpm": 68},
      {"time": "22:35", "bpm": 67}
    ],
    "sleep_stages_json": [
      {"stage": "awake", "start": "22:45", "end": "23:05", "duration": 20},
      {"stage": "deep", "start": "23:40", "end": "01:20", "duration": 100}
    ],
    "noise_json": {"avg_db": 32},
    "created_at": "2026-06-29 22:01:09"
  }
}
```

**验证确定性随机：** 再次请求同一日期，数据应完全一致！

---

## 四、完整测试流程（按顺序执行）

```
1️⃣  GET  http://localhost:3000/
    → 验证服务器启动

2️⃣  POST http://localhost:3000/api/v1/auth/register
    Body: {"phone":"13800138000","password":"123456"}
    → 验证注册功能

3️⃣  POST http://localhost:3000/api/v1/auth/register
    Body: {"phone":"13800138000","password":"123456"}
    → 验证重复注册返回错误

4️⃣  POST http://localhost:3000/api/v1/auth/login
    Body: {"phone":"13800138000","password":"123456"}
    → 复制返回的 token

5️⃣  POST http://localhost:3000/api/v1/auth/login
    Body: {"phone":"13800138000","password":"wrong"}
    → 验证密码错误

6️⃣  设置 Authorization: Bearer {token}（后面所有接口都要）

7️⃣  GET  http://localhost:3000/api/v1/devices/list
    → 应返回空数组 []

8️⃣  POST http://localhost:3000/api/v1/devices/add
    Body: {"is_virtual": true}
    → 添加虚拟设备

9️⃣  GET  http://localhost:3000/api/v1/devices/list
    → 应返回包含 1 台设备的数组

🔟  PUT  http://localhost:3000/api/v1/devices/1
    Body: {"nickname": "我的睡眠仪"}
    → 修改设备昵称

1️⃣1️⃣ DELETE http://localhost:3000/api/v1/devices/1
    → 删除设备

1️⃣2️⃣ GET  http://localhost:3000/api/v1/devices/list
    → 应再次返回空数组 []

1️⃣3️⃣ 重新添加设备（为睡眠报告做准备）
    POST http://localhost:3000/api/v1/devices/add
    Body: {"is_virtual": true}

1️⃣4️⃣ GET  http://localhost:3000/api/sleep/report/daily?date=2026-06-28
    → 首次请求生成睡眠数据

1️⃣5️⃣ GET  http://localhost:3000/api/sleep/report/daily?date=2026-06-28
    → 再次请求，验证数据完全一致（确定性随机）

1️⃣6️⃣ 重启服务器（Ctrl+C 后重新 npm run dev）

1️⃣7️⃣ GET  http://localhost:3000/api/sleep/report/daily?date=2026-06-28
    → 验证重启后数据依然存在（saveDb 持久化生效）
```

---

## 五、验收要点（老师可能检查）

### 必测项
- [ ] 注册成功返回 `{id, phone, nickname, role:"patient"}`
- [ ] 登录成功返回 `token`
- [ ] 重复注册返回 "该手机号已注册"
- [ ] 错误密码返回 "密码错误"
- [ ] 无 Token 访问设备接口返回 401/403
- [ ] 添加虚拟设备返回 `is_virtual:1, online_status:1`
- [ ] 设备列表按 `created_at DESC` 排序
- [ ] 修改/删除设备有权限校验（不能操作别人的设备）
- [ ] 睡眠报告首次请求生成数据
- [ ] 睡眠报告二次请求返回相同数据（确定性随机）
- [ ] 重启服务器后数据不丢失（saveDb 生效）
- [ ] 睡眠报告包含 `rem_sleep_minutes` 字段
- [ ] 睡眠报告的 `device_id` 关联了用户的设备

### 加分项
- [ ] 手机号格式校验（11位数字）
- [ ] 密码长度校验（>=6位）
- [ ] 账号禁用状态检查（status !== 1）
- [ ] UNIQUE 约束异常处理（并发场景）
- [ ] 设备序列号格式校验（16位字母数字）

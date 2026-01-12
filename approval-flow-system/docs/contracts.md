# 接口契约（当前前端使用）

## 1. 登录与用户映射
### GET /auth/saas-user
- 说明：代理 SaaS 用户信息（前端带 Bearer token）。
- Header：`Authorization: Bearer <token>`
- 返回：SaaS 用户完整信息（包含 email/roles/groups 等字段）。

### POST /auth/resolve-user
- 说明：根据 email 映射本系统用户（岗位号/角色/大区）。
- 请求体：
```json
{ "email": "someone@neurogen.com.cn" }
```
- 返回（示例）：
```json
{
  "email": "someone@neurogen.com.cn",
  "actorCode": "NCNSCXXX",
  "actorRole": "MR",
  "name": "张三",
  "region": "华北",
  "hierarchy": {
    "dsmCode": "NCNSC001",
    "dsmName": "李四",
    "rsmCode": "NCNSC010",
    "rsmName": "王五"
  },
  "source": "userMapping"
}
```

### GET /auth/mock-login
- 说明：本地联调用（非默认入口）。
- 参数：`email`

## 2. 权限范围与主数据
### GET /hospitals/scope
- Header：`x-actor-code`
- 返回：权限内医院列表
```json
[
  {
    "code": "N-H001230",
    "name": "南京市第一医院",
    "region": "华东",
    "province": "江苏",
    "city": "南京",
    "salesType": "医院",
    "mrCode": "NCNSC001",
    "mrName": "张三"
  }
]
```

### GET /pharmacies/scope
- Header：`x-actor-code`
- Query：`source=whitelist|assignment|new-link`，`q=关键词`
- 返回：药店+关联医院列表
```json
[
  {
    "pharmacyCode": "N-R00192",
    "pharmacyDisplayCode": "N-R00192",
    "pharmacyName": "江苏益丰大药房…",
    "hospitalCode": "N-H001230",
    "hospitalName": "南京市第一医院"
  }
]
```

### GET /whitelist/pharmacies
- Query：`q`、`page`、`pageSize`
- 返回：
```json
{
  "data": [{ "code": "N-R00192", "name": "药店名称", "pharmacyType": "关联" }],
  "total": 120,
  "page": 1,
  "pageSize": 20
}
```

## 3. 流程
### GET /workflows
- Header：`x-actor-code`
- Query：`type`、`status`、`actorCode`
- 返回：流程列表（含 steps、attachments、payload）。

### GET /workflows/:id
- Header：`x-actor-code`
- 返回：流程详情（含 steps、actions、attachments、payload）。

### POST /workflows
- Header：`x-actor-code`、`x-actor-role`（可选）
- 请求体（核心字段）：
```json
{
  "type": "NEW_TARGET_HOSPITAL",
  "title": "新增理由",
  "payload": { "hospitalCode": "N-H001230", "...": "..." },
  "submittedByName": "张三",
  "submittedByRole": "MR"
}
```

### POST /workflows/:id/actions
- Header：`x-actor-code`、`x-actor-role`
- 请求体：
```json
{ "action": "APPROVE", "role": "BISO1", "comment": "同意", "stepId": "..." }
```

### POST /workflows/:id/delete
- 说明：删除草稿（`DRAFT`）。

### GET /workflows/export
- Query：`format=csv|xlsx`、`multiSheet=true|false`
- 说明：Excel 导出 5 个 Sheet（新增目标医院/取消目标医院/新增关联药房/取消关联药房/医院区域调整）。

# 接口契约（与 Mock 对齐）

## 主数据
### GET /masterdata/hospitals
- 字段：`id`、`code`、`name`、`regionCode`、`address`
- 示例：
```json
{
  "data": [
    {"id":"H001","code":"H001","name":"Central Hospital","regionCode":"R01","address":"123 Main St"}
  ]
}
```

### GET /masterdata/pharmacies
- 字段：`id`、`code`、`name`、`regionCode`、`type`
- 示例：
```json
{
  "data": [
    {"id":"P001","code":"P001","name":"Pharmacy One","regionCode":"R01","type":"A"}
  ]
}
```

### GET /masterdata/representatives
- 字段：`id`、`name`、`role`、`regionCode`
- 示例：
```json
{
  "data": [
    {"id":"MR01","name":"Alice","role":"MR","regionCode":"R01"}
  ]
}
```

### GET /masterdata/regions
- 字段：`code`、`name`
- 示例：
```json
{
  "data": [
    {"code":"R01","name":"North"}
  ]
}
```

## 指标（弱校验用）
### GET /metric/hospital-target
- 字段：`hospitalCode`、`hospitalName`、`availableAmount`、`currency`、`lastUpdated`
- 示例：
```json
{
  "data": [
    {"hospitalCode":"H001","hospitalName":"Central Hospital","availableAmount":100000,"currency":"CNY","lastUpdated":"2024-01-01T00:00:00.000Z"}
  ]
}
```

## 通知
### POST /notify/approval
- 请求体字段：`processId`、`status`、`actionBy`、`comment?`
- 响应：
```json
{ "code": 0, "message": "ok" }
```

## 错误码格式（通用）
```json
{ "code": 40001, "message": "invalid parameter" }
```

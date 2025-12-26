创建数据表

 最新更新：大约 1 个月前

支持通过该 API 接口，为 Agent 创建新的数据表及其表字段。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/database/create-table
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/database/create-table' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "name": "test_api",
    "description": "测全部数据库api",
    "fields": [
        {
            "name": "id",
            "description": "id",
            "type": "TEXT", 
            "required": true,
            "unique": true
        },
        {
            "name": "boolean",
            "description": "boolean",
            "type": "BOOLEAN",
            "required": true,
            "unique": false
        },
        {
            "name": "int",
            "description": "int",
            "type": "INT",
            "required": true,
            "unique": true
        },
        {
            "name": "datetime",
            "description": "datetime",
            "type": "DATETIME",
            "required": true,
            "unique": false
        },
        {
            "name": "float",
            "description": "float",
            "type": "FLOAT",
            "required": false,
            "unique": false
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求体

| 字段                 | 类型    | 必填 | 描述                                                |
| :------------------- | :------ | :--- | :-------------------------------------------------- |
| name                 | string  | 是   | 表名称：32 个字符，a~z/数字和下划线，字母开头。     |
| description          | string  | 是   | 表描述：128 个字符，让 LLM 理解该表的数据构成。     |
| fields               | array   | 是   | 表字段数组。                                        |
| fields[].name        | string  | 是   | 字段名称：32 个字符，a~z/数字和下划线。             |
| fields[].description | string  | 是   | 字段描述：128 个字符，，让 LLM 理解该表的数据构成。 |
| fields[].type        | string  | 是   | 数据类型：TEXT/INT/FLOAT/DATETIME/BOOLEAN。         |
| fields[].required    | boolean | 否   | 必要性：true/false。                                |
| fields[].unique      | boolean | 否   | 唯一性：true/false。                                |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK",
    "data": "673e9c7a9f7bc178002dbce8"
}
```

### 成功响应

| 字段    | 类型   | 描述                        |
| :------ | :----- | :-------------------------- |
| code    | int    | 消息的类型编码。            |
| message | string | 消息描述。                  |
| data    | object | 回复内容,数据表的唯一标识。 |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code   | Message          |
| :----- | :--------------- |
| 40000  | 参数错误         |
| 50000  | 系统内部错误     |
| 403100 | 表名无效         |
| 403101 | 表描述无效       |
| 403102 | 字段数量无效     |
| 403103 | 字段名称无效     |
| 403104 | 字段描述无效     |
| 403105 | 字段类型无效     |
| 403111 | 字段数量超过限制 |
| 403108 | 表名已经存在     |

添加表数据

 最新更新：18 天前

支持通过该 API 接口，单次将最多 1000 行数据添加到指定的 Agent 的数据表中，以便在对话中使用和查询。

> **注意**：
>
> - 开启了`唯一性`字段的 value 长度禁止超过**256字符**。
> - 未开启`唯一性`字段的 value 长度禁止超过**4294967295字符**(实际上受限于网络问题，建议控制数据长度)。
> - 通过接口传输的数据将被转换为CSV数据，CSV文件大小禁止超过 10 M。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/database/import/records
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X 'POST' 'https://api-${endpoint}.gptbots.ai/v1/database/import/records' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "table_id": "673af861ed69656ac0895b07",
    "records": [
        {
            "values": {
                "id": "7424489",
                "name": "4455566777777"
            }
        }, 
        {
            "values": {
                "id": "7852549",
                "name": "446656677665"
            }
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求体

| 字段     | 类型   | 必填 | 描述             |
| :------- | :----- | :--- | :--------------- |
| records  | list   | 是   | 导入的数据集合。 |
| table_id | string | 是   | 表id。           |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "success",
    "data": [
        "673e9cda9f7bc178002dbd9c"
    ]
}
```

### 成功响应

| 字段    | 类型   | 描述                                    |
| :------ | :----- | :-------------------------------------- |
| code    | int    | 消息的类型编码。                        |
| message | string | 消息描述。                              |
| data    | object | 本次添加表数据的任务ID，仅会返回1个ID。 |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message      |
| :---- | :----------- |
| 40000 | 参数错误     |
| 50000 | 系统内部错误 |

查询添加状态

 最新更新：18 天前

通过该 API 接口，发送请求以查询添加表数据任务的处理状态。

## 请求方式

```
GET
```

## 调用地址

```
https://api-${endpoint}/v1/database/query/import-results
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X GET 'https://api-${endpoint}/v1/database/query/import-results?ids=id1&ids=id2' \
-H 'Authorization: Bearer ${API Key}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |

### 查询参数

| 字段 | 类型 | 必填 | 描述                 |
| :--- | :--- | :--- | :------------------- |
| ids  | list | 是   | 添加数据任务id集合。 |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK",
    "progress": 0,
    "data": [
        {
            "id": "673e9cda9f7bc178002dbd9c",
            "progress": 1,
            "status": "FAIL",
            "success_count": 0,
            "fail_count": 2,
            "fail_detail": [
              {"row_number_start":1,"row_number_end":10,"fail_reason":"fail reason"},
              {"row_number_start":31,"row_number_end":40,"fail_reason":"fail reason"}
            ]
        }
    ]
}
```

> 系统默认将**10 行划分为一个 chunk**,错误原因为该 chunk 中第一行失败的原因。

### 成功响应

| 字段          | 类型   | 描述                                                         |
| :------------ | :----- | :----------------------------------------------------------- |
| code          | int    | 消息的类型编码。                                             |
| message       | string | 消息描述。                                                   |
| progress      | int    | 进度值。                                                     |
| data          | list   | 数据结果。                                                   |
| id            | string | 查询任务id。                                                 |
| success_count | int    | 成功数量。                                                   |
| fail_count    | int    | 失败数量。                                                   |
| fail_detail   | list   | 添加对象与失败原因,系统默认将10行划分为一个chunk,错误原因为该chunk中第一行失败的原因 |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message      |
| :---- | :----------- |
| 50000 | 系统内部错误 |



更新表数据

 最新更新：3 天前

可以通过该接口，批量更新 Agent 数据表中的指定目标记录的值，最大支持更新 100 条记录。

> **注意**：
> 更新时整个 JSON 请求体（request body）的大小限制为 5MB。
> 每个请求最多更新 100 条记录。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}gptbots.ai/v2/database/update/record
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md) 的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}gptbots.ai/v2/database/update/record' \ 
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
      "table_id": "673af861ed69656ac0895b07",
      "is_create": true,
      "update_data":[
        {
          "record_id":"123456",
          "updated_fields": {
          "name": "andy",
          "age": "30"
        },
        {  
          "filter": {
          "id": "789"
          },
          "updated_fields": {
          "name": "mop",
          "age": "32"
        }
      ]
    }'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求体

| 字段           | 类型   | 必填 | 描述                                         |
| :------------- | :----- | :--- | :------------------------------------------- |
| table_id       | string | 是   | 表id。                                       |
| update_data    | list   | 是   | 更新的数据集合。                             |
| is_creat       | bool   | 否   | 当**指定目标记录**不存在时，是否创建新记录。 |
| updated_fields | list   | 是   | 更新的数据集合。                             |

> record_id 与 filter 条件必须二选一，推荐使用 record_id 。当两者都传入时，以 record_id 为准。
> is_create 默认值为 false ,当未传入 is_create 时，默认不自动创建新记录。

## 响应

### 响应示例

```
{
    "totalCount": 4,
    "success_count": 2,
    "fail_count": 2,
    "fail_detail": [
        {
            "upsert_data": {
                "record_id": "123456",
                "value": {
                    "name": "测试用户",
                    "email": "invalid_email"
                }
            },
            "fail_reason": "邮箱格式不正确"
        },
        {
            "upsert_data": {
                "filter": {
                    "id": "789"
                },
                "value": {
                    "name": "测试用户",
                    "email": "invalid_email"
                }
            },
            "fail_reason": "邮箱格式不正确"
        }
    ]
}
```

### 成功响应

| 字段          | 类型   | 描述                     |
| :------------ | :----- | :----------------------- |
| totalCount    | int    | 本次更新任务的数据总行数 |
| success_count | string | 已成功更新的行数         |
| fail_count    | string | 更新失败的行数           |
| fail_detail   | array  | 更新失败的详细原因。     |

### 失败响应

| 字段    | 类型   | 描述         |
| :------ | :----- | :----------- |
| code    | int    | 错误码。     |
| message | string | 错误描述信息 |

### 错误码

| Code   | Message        |
| :----- | :------------- |
| 40000  | 参数错误       |
| 50000  | 系统内部错误   |
| 403106 | 未找到表       |
| 403131 | 无权访问数据表 |



获取数据库记录

 最新更新：大约 1 个月前

支持通过该 API 接口，发送请求以获取指定数据表的分页记录数据。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/database/records/page
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/database/records/page' \ 
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "table_id": "673d7d00ce119a7e9f47d152",
    "page": 1,
    "page_size": 10,
    "filter": {
        "id": "1",
        "int": 100
    },
    "keyword":"keyword"
    }'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求体

| 字段      | 类型   | 必填 | 描述                                         |
| :-------- | :----- | :--- | :------------------------------------------- |
| table_id  | string | 是   | 表id。                                       |
| page      | int    | 是   | 页码数，即需要请求第几页，从 1 开始。        |
| page_size | int    | 是   | 每页的数据量，范围 1-100。                   |
| filter    | map    | 否   | 用户自定义过滤条件（例如：自定义唯一主键）。 |
| keyword   | string | 否   | 关键词，支持模糊查询。                       |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK",
    "data": {
        "table_info": {
            "id": "673e9c7a9f7bc178002dbce8",
            "name": "test_api",
            "description": "测全部数据库api",
            "field_count": 5,
            "fields": [
                {
                    "name": "id",
                    "description": "id",
                    "type": "TEXT",
                    "required": true,
                    "unique": true
                },
                {
                    "name": "boolean",
                    "description": "boolean",
                    "type": "BOOLEAN",
                    "required": true,
                    "unique": false
                },
                {
                    "name": "int",
                    "description": "int",
                    "type": "INT",
                    "required": true,
                    "unique": true
                },
                {
                    "name": "datetime",
                    "description": "datetime",
                    "type": "DATETIME",
                    "required": true,
                    "unique": false
                },
                {
                    "name": "float",
                    "description": "float",
                    "type": "FLOAT",
                    "required": false,
                    "unique": false
                }
            ],
            "bot_id": "673e93aca7c4223becf6caf0",
            "project_id": "665465e2b5c78e6c7ab92d2b",
            "owner_id": "665465e2b5c78e6c7ab92d28"
        },
        "records": [
            {
                "id": "541278230707963208",
                "value": {
                    "id": "1",
                    "boolean": true,
                    "int": 1,
                    "datetime": "2029-10-01 12:00:00",
                    "float": 2024.21
                },
                "created_at": 1732156566000,
                "updated_at": 1732156607000
            }
        ],
        "total_count": 2
    }
}
```

### 成功响应

| 字段                 | 类型   | 描述                         |
| :------------------- | :----- | :--------------------------- |
| code                 | int    | 消息的类型编码。             |
| message              | string | 消息描述。                   |
| total_count          | int    | 总记录数。                   |
| records              | array  | 数据记录数组。               |
| records[].id         | string | 数据 ID。                    |
| records[].value      | object | 数据值。                     |
| records[].created_at | long   | 创建时间。                   |
| records[].updated_at | long   | 更新时间。                   |
| table_info           | object | 数据表的信息，包括以下属性： |

#### tableInfo 属性

| 字段                 | 类型    | 描述                               |
| :------------------- | :------ | :--------------------------------- |
| id                   | string  | 数据表的唯一标识。                 |
| name                 | string  | 数据表名称。                       |
| description          | string  | 数据表描述。                       |
| fieldCount           | int     | 字段数量。                         |
| fields               | array   | 字段数组，包含每个字段的详细信息。 |
| fields[].name        | string  | 字段名称。                         |
| fields[].description | string  | 字段描述。                         |
| fields[].type        | string  | 数据类型，如 TEXT、INT、FLOAT 等。 |
| fields[].required    | boolean | 是否为必填字段。                   |
| fields[].unique      | boolean | 是否唯一字段。                     |
| bot_id               | string  | botid。                            |
| project_id           | string  | 项目 ID。                          |
| owner_id             | string  | 数据表所有者 ID。                  |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code   | Message        |
| :----- | :------------- |
| 40000  | 参数错误       |
| 50000  | 系统内部错误   |
| 403106 | 未找到表       |
| 403131 | 无权访问数据表 |

删除表数据

 最新更新：18 天前

可以通过该接口，批量删除 Agent 数据表中的指定记录数据的值，最大支持删除 1000 条记录。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}/v2/database/delete/record
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md) 的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}/v2/database/delete/record' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
      "table_id": "673af861ed69656ac0895b07",
      "delete_data":[
        {
          "record_id":"123456",
        },
        {  
          "filter": {
          "id": "789"
        }
      ]
    }'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求体

| 字段        | 类型   | 必填 | 描述           |
| :---------- | :----- | :--- | :------------- |
| table_id    | string | 是   | 表id。         |
| delete_data | array  | 是   | 删除数据集合。 |

> 注意：record_id 与 filter 条件必须二选一，推荐使用 record_id 。当两者都传入时，以 record_id 为准。

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK"
}
```

### 成功响应

| 字段    | 类型   | 描述             |
| :------ | :----- | :--------------- |
| code    | int    | 消息的类型编码。 |
| message | string | 消息描述。       |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code   | Message        |
| :----- | :------------- |
| 40000  | 参数错误       |
| 50000  | 系统内部错误   |
| 403106 | 未找到表       |
| 403131 | 无权访问数据表 |
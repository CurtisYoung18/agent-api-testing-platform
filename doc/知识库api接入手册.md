# 知识库api接入手册

获取知识库列表

 最新更新：大约 1 个月前

获取 Agent 内的知识库的列表。

## 请求方式

```
GET
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/knowledge/base/page
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X GET 'https://api-${endpoint}.gptbots.ai/v1/bot/knowledge/base/page' \
-H 'Authorization: Bearer ${API Key}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |

### 请求体

无。

## 响应

### 响应示例

```
{
    "knowledge_base": [
        {
            "id": "xxxxxx",
            "name": "My Knowledge Base",
            "desc": "This is my knowledge base.",
            "doc": 10,
            "chunk": 1000,
            "token": 1000000,
            "owner_id": "xxxxxx",
            "owner_email": "johnlee@gptbots.ai"
        },
        {
            "id": "xxxxxx",
            "name": "My Knowledge Base 2",
            "desc": "This is my knowledge base 2.",
            "doc": 10,
            "chunk": 1000,
            "token": 1000000,
            "owner_id": "xxxxxx",
            "owner_email": "jasonwong@gptbots.ai"
        }
    ]
}
```

### 成功响应

| 字段           | 类型          | 说明         |
| :------------- | :------------ | :----------- |
| knowledge_base | Array<Object> | 知识库列表。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |



获取知识文档列表

 最新更新：大约 1 个月前

获取 Agent 内的知识库的知识文档的列表。

## 请求方式

```
GET
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/query/page
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X GET 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/query/page?page=1&page_size=10&knowledge_base_id=67457fea6f658672d6482542' \
-H 'Authorization: Bearer ${API Key}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |

### 请求参数

| 字段              | 类型    | 必填 | 说明                            |
| :---------------- | :------ | :--- | :------------------------------ |
| knowledge_base_id | String  | 是   | 知识库的 ID。                   |
| page              | Integer | 是   | 页码，从 1 开始。               |
| page_size         | Integer | 是   | 每页的文档数。填写范围 10-100。 |

## 响应

### 响应示例

```
{
    "list": [
        {
            "id": "xxxxxx",
            "name": "My Doc",
            "format": "pdf",
            "source_url": "https://gptbots.ai/article_1.pdf",
            "status": "ACTIVE",
            "chunk": 100,
            "token": 1000000,
            "char_count": 10000000,
            "create_time": 1699843200,
            "update_time": 1699843200,
            "creator_id": "xxxxxx",
            "creator_email": "johnlee@gptbots.ai"
        },
        {
            "id": "xxxxxx",
            "name": "My Doc 2",
            "format": "txt",
            "source_url": "https://gptbots.ai/article_2.html",
            "status": "ACTIVE",
            "chunk": 100,
            "token": 1000000,
            "char_count": 10000000,
            "create_time": 1699843200,
            "update_time": 1699843200,
            "creator_id": "xxxxxx",
            "creator_email": "johnlee@gptbots.ai"
        }
    ],
    "total": 100
}
```

### 成功响应

| 字段  | 类型          | 说明               |
| :---- | :------------ | :----------------- |
| list  | Array<Object> | 文档列表。         |
| total | Integer       | 查询到的文档总数。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |

添加文本类文档

 最新更新：大约 1 个月前

批量添加上传**文本类型**的文档，并依次执行分块/切片、嵌入/向量化及储存，获得新的文档 ID。

> 注意：
> 嵌入模型使用的是默认的模型，不可在 API 内定义。
> 仅返回上传结果，不返回最终的嵌入结果。您可以通过“查询文档状态”API 获取最终结果。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/text/add
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/text/add' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "knowledge_base_id": "67457fea6f658672d6482542",
    "chunk_token": 700,
    "splitter": "\n",
    "files": [
        {
            "file_url": "https://www.gptbots.ai/docs/article_1.pdf",
            "file_base64": "SGVsbG8sIEJhc2U2NCBFbmNvZGluZyE=",
            "source_url": "https://www.gptbots.ai/docs/article_1.pdf",
            "file_name": "article_1.pdf"
        }
    ]
}'
```

### 请求头

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
|      |      |      |

```
| Authorization | Bearer ${token} | 使用 `Authorization: Bearer ${token}` 进行调用验证，请在 API 密钥页面获取密钥作为 token。 |
```

| Content-Type | application/json | 数据类型，取值为 `application/json` 。 |

### 请求参数

| 字段              | 类型          | 必填 | 说明                                                         |
| :---------------- | :------------ | :--- | :----------------------------------------------------------- |
| knowledge_base_id | String        | 否   | 文档添加的目标知识库。若不填写，则默认添加至“Default”知识库。 |
| files             | Array<Object> | 是   | 添加的文档列表。最多支持同时添加 20 个文档。                 |
| chunk_token       | Integer       | 否   | 分块时单个知识块的最大 Token 数。默认值为 600。填写范围 1-1000。 **注**：`chunk_token` 与 `splitter` 字段必须**2选1**，当两者都不入参将报错，当同时入参则优先使用分隔符。 |
| splitter          | String        | 否   | 分块时使用的分隔符。默认空。可使用“自定义字符串”作为分隔符。 **注**：`chunk_token` 与 `splitter` 字段必须**2选1**，当两者都不入参将报错，当同时入参则优先使用分隔符。 |

## 响应

### 响应示例

```
{
    "doc": [
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_1.txt"
        },
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_2.pdf"
        }
    ],
    "failed": [
        "file_1",
        "file_2"
    ]
}
```

### 成功响应

| 字段 | 类型          | 说明             |
| :--- | :------------ | :--------------- |
| doc  | Array<Object> | 添加的文档列表。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |

添加表格类文档

 最新更新：大约 1 个月前

批量添加上传**表格类型**的文档，并依次执行分块/切片、嵌入/向量化及储存，获得新的文档 ID。

> 注意：
> 嵌入模型使用的是默认的模型，不可在 API 内定义。
> 仅返回上传结果，不返回最终的嵌入结果。您可以通过“查询文档状态”API 获取最终结果。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/spreadsheet/add
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/spreadsheet/add' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "knowledge_base_id": "67457fea6f658672d6482542",
    "chunk_token": 700,
    "header_row": 5,
    "files": [
        {
            "file_url": "https://www.gptbots.ai/doc/spreadsheet_1.xlsx",
            "file_base64": "SGVsbG8sIEJhc2U2NCBFbmNvZGluZyE=",
            "source_url": "https://www.gptbots.ai/doc/spreadsheet_1.xlsx",
            "file_name": "spreadsheet_1.xlsx"
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 `application/json` 。                       |

### 请求参数

| 字段              | 类型          | 必填 | 说明                                                         |
| :---------------- | :------------ | :--- | :----------------------------------------------------------- |
| knowledge_base_id | String        | 否   | 文档添加的目标知识库。若不填写，则默认添加至“Default”知识库。 |
| files             | Array<Object> | 是   | 添加的文档列表。最多支持同时添加 20 个文档。                 |
| chunk_token       | Integer       | 否   | 分块时，单个知识块的最大 Token 数。默认值为 600。填写范围 1-1000。 |
| header_row        | Integer       | 否   | 作为表头的最大行数。表格类文档以“表头+数据行”为单位进行分块。默认值为 1。填写范围 1-5。 |

## 响应

### 响应示例

```
{
    "doc": [
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_1.csv"
        },
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_2.xlsx"
        }
    ],
    "failed": [
        "file_1",
        "file_2"
    ]
}
```

### 成功响应

| 字段名 | 类型          | 说明             |
| :----- | :------------ | :--------------- |
| doc    | Array<Object> | 添加的文档列表。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |

更新文本类文档

 最新更新：大约 1 个月前

批量更新**文本类型**的文档，系统将依次执行分块/切片、嵌入/向量化，最后用新文档内容替换掉旧文档内容，但文档 ID 不变。

> 注意：
> 嵌入模型使用的是默认的模型，不可在 API 内定义。
> 仅返回上传结果，不返回最终的嵌入结果。您可以通过“查询文档状态”API 获取最终结果。

## 请求方式

```
PUT
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/text/update
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X PUT 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/text/update' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "knowledge_base_id": "67457fea6f658672d6482542",
    "chunk_token": 600,
    "splitter": "\n",
    "files": [
        {
            "doc_id": "675158a5af12af632a4f63f6",
            "file_url": "https://www.gptbots.ai/doc/article_1.pdf",
            "source_url": "https://www.gptbots.ai/doc/article_1.pdf",
            "file_name": "article_1.pdf"
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 `Authorization: Bearer ${API Key}` 进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 `application/json` 。                       |

### 请求体

| 字段        | 类型          | 必填 | 说明                                                         |
| :---------- | :------------ | :--- | :----------------------------------------------------------- |
| files       | Array<Object> | 是   | 更新的文档列表。最多支持同时更新 200 个文档。                |
| chunk_token | Integer       | 否   | 分块时，单个知识块的最大 Token 数。默认值为 600。填写范围 1-1000。 注：最大 Token 数和分隔符二选一。当同时入参时，优先使用分隔符。 |
| splitter    | String        | 否   | 分块时，使用的分隔符。默认空。可使用“\n”作为换行分隔符。 注：最大 Token 数和分隔符二选一。当同时入参时，优先使用分隔符。 |

## 响应

### 响应示例

```
{
    "doc": [
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_1.txt"
        },
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_2.pdf"
        }
    ],
    "failed": [
        "xxxxxx",
        "xxxxxx"
    ]
}
```

### 成功响应

| 字段 | 类型          | 说明             |
| :--- | :------------ | :--------------- |
| doc  | Array<Object> | 更新的文档列表。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |



更新表格类文档

 最新更新：大约 1 个月前

批量更新**表格类型**的文档，系统将依次执行分块/切片、嵌入/向量化，最后用新文档内容替换掉旧文档内容，但文档 ID 不变。

> 注意：
> 嵌入模型使用的是默认的模型，不可在 API 内定义。
> 仅返回上传结果，不返回最终的嵌入结果。您可以通过“查询文档状态”API 获取最终结果。

## 请求方式

```
PUT
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/spreadsheet/update
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X PUT 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/spreadsheet/update' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "knowledge_base_id": "67457fea6f658672d6482542",
    "chunk_token": 700,
    "header_row": 5,
    "files": [
        {
            "doc_id": "67457fea6f658672d6482542",
            "file_url": "https://www.gptbots.ai/doc/spreadsheet.xlsx",
            "source_url": "https://www.gptbots.ai/doc/spreadsheet.xlsx",
            "file_name": "spreadsheet_1.pdf"
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 `Authorization: Bearer ${API Key}` 进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 `application/json` 。                       |

### 请求体

| 字段        | 类型          | 必填 | 说明                                                         |
| :---------- | :------------ | :--- | :----------------------------------------------------------- |
| files       | Array<Object> | 是   | 更新的文档列表。最多支持同时更新 20 个文档。                 |
| chunk_token | Integer       | 否   | 分块时，单个知识块的最大 Token 数。默认值为 600。填写范围 1-1000。 |
| header_row  | Integer       | 否   | 作为表头的最大行数。表格类文档以“表头+数据行”为单位进行分块。默认值为 1。填写范围 1-5。 |

## 响应

### 响应示例

```
{
    "doc": [
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_1.csv"
        },
        {
            "doc_id": "xxxxxx",
            "doc_name": "test_2.xlsx"
        }
    ],
    "failed": [
        "xxxxxx",
        "xxxxxx"
    ]
}
```

### 成功响应

| 字段 | 类型          | 说明             |
| :--- | :------------ | :--------------- |
| doc  | Array<Object> | 更新的文档列表。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |



删除知识文档

 最新更新：大约 1 个月前

从知识库删除文档。

## 请求方式

```
DELETE
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/batch/delete
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X DELETE 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/batch/delete?doc=67501ddb8cf3c334cd0e8e70,12345ddb8cf3c334cd0e0987' \
-H 'Authorization: Bearer ${API Key}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |

### 请求参数

| 字段 | 类型          | 必填 | 说明              |
| :--- | :------------ | :--- | :---------------- |
| doc  | Array<String> | 是   | 要删除的文档 ID。 |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK"
}
```

### 成功响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 响应码。   |
| message | String  | 响应详情。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |



添加知识块（文本类）

 最新更新：大约 1 个月前

为文本类文档添加知识块。系统将依次执行分块/切片、嵌入/向量化，最后将为文档添加新的知识块。

注：嵌入模型使用的是默认的模型，不可在 API 内定义。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/doc/chunks/add
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/bot/doc/chunks/add' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "doc_id": "675174292b8b977ba6316191",
    "chunks": [
        {
            "content": "This is a chunk.",
            "keywords": ["This","chunk"]
        }
    ]
}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 `application/json` 。                       |

### 请求参数

| 字段   | 类型          | 必填 | 说明                      |
| :----- | :------------ | :--- | :------------------------ |
| doc_id | String        | 是   | 要添加知识块的文档的 ID。 |
| chunks | Array<Object> | 是   | 知识块内容。              |

## 响应

### 响应示例

```
{
    "code": 0,
    "message": "OK"
}
```

### 成功响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 响应码。   |
| message | String  | 响应详情。 |

### 失败响应

| 字段    | 类型    | 描述       |
| :------ | :------ | :--------- |
| code    | Integer | 错误码。   |
| message | String  | 错误详情。 |



查询文档状态

 最新更新：大约 1 个月前

查询知识库文档的状态。

## 请求方式

```
GET
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/data/detail/list
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X GET 'https://api-${endpoint}.gptbots.ai/v1/bot/data/detail/list?data_ids=65e18b26e121ab08cefb4a53&data_ids=65e18b26e121ab08cefb4a5333' \
-H 'Authorization: Bearer ${API Key}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 `Authorization: Bearer ${API Key}` 进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |

### 请求体

| 字段     | 类型  | 必填 | 描述                  |
| :------- | :---- | :--- | :-------------------- |
| data_ids | array | Yes  | 文档 ID，可提交多个。 |

## 响应

### 响应示例

```
[
    {
        "data_id": "65e18b26e121ab08cefb4a53",
        "data_status": "AVAILABLE"
    }
]
```

### 成功响应

| 字段 | 类型       | 描述       |
| :--- | :--------- | :--------- |
| doc  | JSON Array | 文档信息。 |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message        |
| :---- | :------------- |
| 40000 | 参数错误       |
| 40127 | 开发者鉴权失败 |
| 20059 | Agent 已删除   |



向量相似度匹配

 最新更新：大约 1 个月前

根据提供的查询内容或关键词，在 Agent/Workflow 的知识库中进行检索和召回知识切片。允许开发者通过 group_ids 或 data_ids 指定检索范围、指定 top_k，知识相关性得分和知识重排实现个性化RAG能力。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/vector/match
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/vector/match' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "embedding_rate": 0.9 ,
    "prompt": "GPTBots有哪些API？",
    "group_ids": ["1234567890","1230987654"],
    "data_ids":  ["1234567890","1230987654"],
    "top_k": 10 ,
    "rerank_version": "Jina-reranker-v2-base-multilingual",
    "doc_correlation": 0.70
    }'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 Authorization: Bearer ${API Key}进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求参数

| 字段            | 类型   | 必填 | 描述                                                         |
| :-------------- | :----- | :--- | :----------------------------------------------------------- |
| embedding_rate  | float  | 否   | `关键词`和`语义`的检索权重占比。取值范围：[0,1]，默认值为1。当为0时，仅根据关键词进行检索；当为1时，仅根据语义进行检索；当为0.4时，关键词占比40%和语义占比为60%。 |
| prompt          | string | 是   | 关键词，用于与 Agent/Workflow 内文档进行向量相似度匹配的内容。 |
| group_ids       | array  | 否   | 知识库 ID,用于在指定知识库范围内进行向量检索。当存在1个或多个知识库ID时，在其并集知识范围内进行检索。当为null/不传，则默认为全部知识库。当为 [] 则视为不检索任何知识库。 |
| data_ids        | array  | 否   | 文档 ID，知识库 ID,用于在指定知识文档范围内进行向量检索。当存在1个或多个知识文ID时，在其并集知识范围内进行检索。当为null/不传，则默认为全部知识文档。当为 [] 则视为不检索任何知识文档。 |
| top_k           | int    | 是   | 将关键词与文档 ID 进行向量相似度匹配后，返回相似度最高的 K 个值。填写范围为 [1,50]。 |
| rerank_version  | string | 否   | 知识重排模型名称，对候选知识进行再次排序让知识搜索更精准。以下模型任选其一：BGE-Rerank、Jina-reranker-v2-base-multilingual、Jina-colbert-v2、BCE-Rerank |
| doc_correlation | float  | 否   | 知识相关性得分，用户问题与知识块进行相似度计算后的得分，分数越高越匹配，但过高可能导致无可用知识块。 填写范围为 [0.1,0.95] |

> 当`group_ids`和`data_ids`两者同时有值时，在其**并集**知识范围内进行检索。当两者均为null或不传时，则默认为全部知识库。当两者均为 [] 数组时则视为不检索任何知识。

## 响应

### 响应示例

```
{
  "total": 2,
  "list": [
    {
      "content": "测试数据",
      "data_id": "aS1CNvPK4XCckDKQNj7azC9a",
      "document_name": "demo.md",
      "score": 0.75

    },
    {
      "content": "测试数据",
      "data_id": "aS1CNvPK4XCckDKQNj7azC9a",
      "document_name": "demo.md",
      "score": 0.75 
    }
  ]
}
```

### 成功响应

| 字段  | 类型       | 描述             |
| :---- | :--------- | :--------------- |
| total | int        | 返回的分片总数。 |
| list  | JSON Array | 分片列表。       |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message               |
| :---- | :-------------------- |
| 40000 | 参数错误              |
| 40127 | 开发者鉴权失败        |
| 20059 | Agent/Workflow 已删除 |



重新嵌入文档

 最新更新：大约 1 个月前

对 Agent 内所有状态为「处理失败」的文档进行批量嵌入。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/bot/data/retry/batch
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/bot/data/retry/batch' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{}'
```

### 请求头

| 字段          | 类型              | 描述                                                         |
| :------------ | :---------------- | :----------------------------------------------------------- |
| Authorization | Bearer ${API Key} | 使用 `Authorization: Bearer ${API Key}` 进行调用验证，请在 API 密钥页面获取密钥作为 API Key。 |
| Content-Type  | application/json  | 数据类型，取值为 `application/json` 。                       |

### 请求体

```
无
```

> 注意: 调用该接口后，对 Agent 内所有状态为「处理失败」的文档进行重新向量化处理。

## 响应

### 响应示例

```
{
    "affectCount": 0
}
```

### 成功响应

| 字段        | 类型 | 描述                   |
| :---------- | :--- | :--------------------- |
| affectCount | long | 本次重新嵌入的文档数。 |

### 失败响应

| 字段    | 类型   | 描述       |
| :------ | :----- | :--------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message        |
| :---- | :------------- |
| 40000 | 参数错误       |
| 40127 | 开发者鉴权失败 |
| 20059 | Agent 已删除   |
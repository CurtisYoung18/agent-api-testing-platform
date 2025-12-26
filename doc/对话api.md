## 创建对话ID

用于请求创建并获取一个`conversation_id`，该 ID 是 **用户**与**Agent**进行对话的标识符ID。用户属性、长期记忆和短期记忆等都从属于`conversation_id`。

| ID 名称          | 描述                                                         |
| ---------------- | ------------------------------------------------------------ |
| conversation\_id | 由`agent_id`和`user_id`共同生成的对话标识符ID，用来承载用户与Agent的**一次多轮对话**。一个`conversation_id`通常存在着多条`message_id`。 |
| message\_id      | 由`用户发送消息`和`Agent回复消息`共同生成的消息标识符ID，代表着用户与Agent的一轮对话。`message_id` 必定从属于 `conversation_id`。 |

## 请求方式

`POST`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v1/conversation`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |
| Content-Type  | application/json  | 数据类型，取值为 application/json。                          |

### 请求参数

| 字段     | 类型   | 必填 | 描述                                                         |
| -------- | ------ | ---- | ------------------------------------------------------------ |
| user\_id | string | 是   | 用户标识，开发者需为终端用户定义一个 user\_id，在 Agent 内唯一识别一个用户。最长 32 字符。 |

## 响应

### 响应示例

### 成功响应

| 字段             | 类型   | 描述         |
| ---------------- | ------ | ------------ |
| conversation\_id | string | 对话标识符。 |

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message        |
| ----- | -------------- |
| 40000 | 参数错误       |
| 40127 | 开发者鉴权失败 |
| 40378 | Agent 已删除   |



## 发送消息

通过本 API 可以向指定的 `conversation_id` 发送消息（message），并获取 Agent 生成的响应信息。API 支持提交文本、图片、音频和文档等作为消息内容 。

## 请求方式

`POST`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v2/conversation/message`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

curl -X POST 'https://api-${endpoint}.gptbots.ai/v2/conversation/message' \\ -H 'Authorization: Bearer ${API Key}' \\ -H 'Content-Type: application/json' \\ -d '{ "conversation\_id": "686e2646cb8ee942d9a62d79", "response\_mode": "blocking", "messages": \[ { "role": "user", "content": \[ { "type": "text", "text": "I have uploaded 2 image files, please OCR and return 2 json records." }, { "type": "image", "image": \[ { "base64\_content": "<complete\_base64\_string>", "format": "jpeg", "name": "TAXI1" }, { "url": "https://gptbots.ai/example.png", "format": "png", "name": "TAXI2" } \] }, { "type": "audio", "audio": \[ { "url": "https://gptbots.ai/example.mp3", "format": "mp3", "name": "example1 audio" } \] }, { "type": "document", "document": \[ { "base64\_content": "<complete\_base64\_string>", "format": "pdf", "name": "example pdf" } \] } \] } \], "conversation\_config": { "long\_term\_memory": false, "short\_term\_memory": false, "knowledge": { "data\_ids": \[ "58c70da0403cc812641b9356", "59c70da0403cc812641df35a" \], "group\_ids": \[ "67c70da0403cc812641b93je", "69c70da0403cc812641df35f" \] } } }'

```
                      
                      curl -X POST 'https://api-${endpoint}.gptbots.ai/v2/conversation/message' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "conversation_id": "686e2646cb8ee942d9a62d79",
    "response_mode": "blocking",
    "messages": [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "I have uploaded 2 image files, please OCR and return 2 json records."
                },
                {
                    "type": "image",
                    "image": [
                        {
                            "base64_content": "<complete_base64_string>",
                            "format": "jpeg",
                            "name": "TAXI1"
                        },
                        {
                            "url": "https://gptbots.ai/example.png",
                            "format": "png",
                            "name": "TAXI2"
                        }
                    ]
                },
                {
                    "type": "audio",
                    "audio": [
                        {
                            "url": "https://gptbots.ai/example.mp3",
                            "format": "mp3",
                            "name": "example1 audio"
                        }
                    ]
                },
                {
                    "type": "document",
                    "document": [
                        {
                            "base64_content": "<complete_base64_string>",
                            "format": "pdf",
                            "name": "example pdf"
                        }
                    ]
                }
            ]
        }
    ],
    "conversation_config": {
        "long_term_memory": false,
        "short_term_memory": false,
        "knowledge": {
            "data_ids": [
                "58c70da0403cc812641b9356",
                "59c70da0403cc812641df35a"
            ],
            "group_ids": [
                "67c70da0403cc812641b93je",
                "69c70da0403cc812641df35f"
            ]
        }
    }
}'

                    
```

此代码块在浮窗中显示

**注意**：

1.  `image`、`audio`、`document` 均同时支持 base64 编码和 URL 链接两种方式，2选1即可。
2.  开发者可以仅提交最新用户消息，GPTBots默认会组装短期记忆和长期记忆。若开发者需要自定义短期记忆，可以参考下列示例自定义短期记忆。
  
    "messages": \[ { "role": "user", "content": "Hello" //自定义短期记忆 }, { "role": "assistant", "content": "Hello! How can I assist you today?" //自定义短期记忆 }, { "role": "user", "content": "Hello" //最新用户问题 }\]
    
    ```
                          
                              "messages": [
            {
                "role": "user",
                "content": "Hello"                                //自定义短期记忆
            },
            {
                "role": "assistant",
                "content": "Hello! How can I assist you today?"   //自定义短期记忆
            },
                    {
                "role": "user",
                "content": "Hello"                                //最新用户问题
            }]
    
                        
    ```
    
    此代码块在浮窗中显示
    

### 请求头

| 字段          | 类型             | 描述                                                         |
| ------------- | ---------------- | ------------------------------------------------------------ |
| Authorization | string           | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |
| Content-Type  | application/json | 数据类型，取值为 application/json。                          |

### 请求参数

| 字段             | 类型   | 必填 | 描述                                                         |
| ---------------- | ------ | ---- | ------------------------------------------------------------ |
| conversation\_id | string | 是   | 对话唯一标识符，必须传入需要继续对话的 conversation\_id。    |
| response\_mode   | string | 是   | AI Agent 回复消息的响应和传递方式。+   **blocking**：阻塞型，等待执行完毕后返回结果。（请求若流程较长可能会被中断）。 |
+   **streaming**：流式返回，基于 SSE（[Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)）实现流式返回。
+   **webhook**：Agent 和 人工客服的消息都会发送到 API 页面所配置的 webhook 地址。 |
| messages | JSON Array | 是 | 对话消息内容，支持 `user` 和 `assistant` 2 个角色来构造对话上下文。+   **user message**：必须存在至少 1 条，最新的 user message 应放在最后。
+   **assistant message**:支持开发者自行构造 assistant message 作为上下文 |
| conversation\_config | object | 否 | 支持开发者在本次对话中临时调整 Agent 的功能范围，以应对特殊场景需要。+   **short\_term\_memory**：短记忆开关，支持开启和或关闭短记忆，仅本次对话生效。
+   **long\_term\_memory**：长记忆开关，支持开启和或关闭长记忆，仅本次对话生效。
+   **knowledge**：知识检索范围，支持自定义知识检索范围，仅本次对话生效。`group_ids`和`data_ids`，两者同时有值时，在其并集知识范围内进行检索，两者均为空数组时则视为不检索任何知识；当未携带`knowledge`参数时以 Agent 默认配置的知识范围进行检索。
+   `group_ids`:知识库 ID，可能包含多个知识文档。
+   `data_ids`:知识库中的知识文档 ID |

> +   Text消息：string
> +   Audio消息：.mp3,.wav,
> +   Image消息：.jpg,.jpeg,.png,.gif,.webp
> +   Document消息：.pdf,.txt,.docx,.csv,.xlsx,.html,.json,.md,.tex,.ts,.xml等

## 响应

### 响应示例

{ "create\_time": 1679587005, "conversation\_id": "657303a8a764d47094874bbe", "message\_id": "65a4ccfC7ce58e728d5897e0", "output": \[ { "from\_component\_branch": "1", "from\_component\_name": "组件名称", "content": { "text": "Hi, is there anything I can help you?", "audio": \[ { "audio": "http://gptbots.ai/example.mp3", "transcript": "音频所转录的文字内容" } \] } } \], "usage": { "tokens": { "total\_tokens": 29, //prompt + completion "prompt\_tokens": 19, //prompt "prompt\_tokens\_details": { "audio\_tokens": 0, "text\_tokens":0 }, "completion\_tokens": 10, //completion "completion\_tokens\_details": { "reasoning\_tokens": 0, "audio\_tokens": 0, "text\_tokens": 0 } }, "credits": { "total\_credits":0.0, //prompt + completion "text\_input\_credits": 0.0, "text\_output\_credits": 0.0, "audio\_input\_credits": 0.0, "audio\_output\_credits": 0.0 } } }

```
                      
                      {
    "create_time": 1679587005,
    "conversation_id": "657303a8a764d47094874bbe",
    "message_id": "65a4ccfC7ce58e728d5897e0",
    "output": [
        {
            "from_component_branch": "1",
            "from_component_name": "组件名称",
            "content": {
                "text": "Hi, is there anything I can help you?",
                "audio": [
                    {
                        "audio": "http://gptbots.ai/example.mp3",
                        "transcript": "音频所转录的文字内容"
                    }
                ]
            }
        }
    ],
    "usage": {
        "tokens": {
           "total_tokens": 29,  //prompt + completion
            "prompt_tokens": 19, //prompt
            "prompt_tokens_details": {  
                "audio_tokens": 0,
                "text_tokens":0
            },
            "completion_tokens": 10, //completion
            "completion_tokens_details": {
                "reasoning_tokens": 0,
                "audio_tokens": 0,
                "text_tokens": 0
            }
        },
        "credits": {
            "total_credits":0.0,  //prompt + completion
            "text_input_credits": 0.0,
            "text_output_credits": 0.0,
            "audio_input_credits": 0.0,
            "audio_output_credits": 0.0
        }
    }
}

                    
```

此代码块在浮窗中显示

### 成功响应（阻塞）

> ⚠️ **blocking**响应模式下，人工接管服务不可用。
>
> | 字段                        | 类型       | 描述                                                         |
> | --------------------------- | ---------- | ------------------------------------------------------------ |
> | conversation\_id            | string     | 是                                                           |
> | message\_id                 | string     | 一条对话中，某条消息的唯一标识符。                           |
> | create\_time                | long       | 回复的这条消息产生的时间戳。                                 |
> | output                      | JSON Array | Agent 回复内容。                                             |
> | from\_component\_branch     | string     | FlowAgent 分支。                                             |
> | from\_component\_name       | string     | FlowAgent 上游组件名称。                                     |
> | content                     | object     | AI Agent 回复的消息内容，当前包含了`text`和 `audio` 2 个类型的消息。 |
> | usage                       | object     | 使用消耗。                                                   |
> | tokens                      | JSON Array | 本次对话该 Agent 所消耗的总 tokens。                         |
> | total\_tokens               | integer    | 本次对话 input + output 所消耗的总 tokens。                  |
> | prompt\_tokens              | integer    | 本次对话 input 所消耗的总 tokens。                           |
> | completion\_tokens          | integer    | 本次对话 output 所消耗的总 tokens。                          |
> | prompt\_tokens\_details     | object     | 本次对话 input Token 消耗明细。                              |
> | completion\_tokens\_details | object     | 本次对话 output Token 消耗明细。                             |
> | credits                     | object     | 本次对话该 Agent 所消耗的总积分。。                          |
> | text\_input\_credits        | double     | 本次对话 input text message 所消耗的积分。                   |
> | text\_output\_credits       | double     | 本次对话 output text message 所消耗的积分。                  |
> | audio\_input\_credits       | double     | 本次对话 input audio message 所消耗的积分。                  |
> | audio\_output\_credits      | double     | 本次对话 input audio message 所消耗的积分。                  |

### 成功响应（流式）

> ⚠️ **streaming**响应模式下，人工接管服务不可用。
>
> | 字段    | 类型   | 描述                                                         |
> | ------- | ------ | ------------------------------------------------------------ |
> | code    | int    | 消息的类型编码，3-文本类型、10-Flowagent 输出、0-结束标识、4-消耗数据、39-语音消息。 |
> | message | string | 消息类型，取值：Text、FlowOutput、End。                      |
> | data    | object | 回复内容。                                                   |

{"code":11,"message":"MessageInfo","data":{"message\_id":"6785dba0f06d872bff9ee347"}} {"code":3,"message":"Text","data":"我"} {"code":3,"message":"Text","data":"可以"} {"code":3,"message":"Text","data":"帮"} {"code":3,"message":"Text","data":"助"} {"code":3,"message":"Text","data":"你"} {"code":3,"message":"Text","data":"的"} {"code":3,"message":"Text","data":"吗"} {"code":3,"message":"Text","data":"?"} {"code":10,"message":"FlowOutput","data":\[{"content":"你好","branch":null,"from\_component\_name": "User Input"}\]} {"code":4,"message":"Cost","data":{"prompt\_tokens":4922,"completion\_tokens":68,"total\_tokens":4990,"prompt\_tokens\_details":{"audio\_tokens":0,"text\_tokens":4922},"completion\_tokens\_details":{"reasoning\_tokens":0,"audio\_tokens":0,"text\_tokens":68}}} {"code":0,"message":"End","data":null}

```
                      
                      {"code":11,"message":"MessageInfo","data":{"message_id":"6785dba0f06d872bff9ee347"}}
{"code":3,"message":"Text","data":"我"}  
{"code":3,"message":"Text","data":"可以"}
{"code":3,"message":"Text","data":"帮"}  
{"code":3,"message":"Text","data":"助"}
{"code":3,"message":"Text","data":"你"}  
{"code":3,"message":"Text","data":"的"}
{"code":3,"message":"Text","data":"吗"}
{"code":3,"message":"Text","data":"?"}
{"code":10,"message":"FlowOutput","data":[{"content":"你好","branch":null,"from_component_name": "User Input"}]}
{"code":4,"message":"Cost","data":{"prompt_tokens":4922,"completion_tokens":68,"total_tokens":4990,"prompt_tokens_details":{"audio_tokens":0,"text_tokens":4922},"completion_tokens_details":{"reasoning_tokens":0,"audio_tokens":0,"text_tokens":68}}}
{"code":0,"message":"End","data":null}

                    
```

此代码块在浮窗中显示

{"code":11,"message":"MessageInfo","data":{"message\_id":"67b857b6be1f2906861a5e75"}} {"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"你好"}} {"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"，请"}} {"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"问"}} {"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"有什么"}} {"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}} {"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}} {"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}} {"code":10,"message":"FlowOutput","data":\[{"content":" Audio:https://gptbots.ai/example.wav,Transcript:(Hello! How can I assist you today?)","audioDatas":\[{"transcript":"Hello! How can I assist you today?","url":"https://gptbots.ai/example.wav","seconds":3}\],"from\_component\_name":"AI Model-1"}\],"componentId":12}{"code":4,"message":"Cost","data":{"prompt\_tokens":4922,"completion\_tokens":68,"total\_tokens":4990,"prompt\_tokens\_details":{"audio\_tokens":0,"text\_tokens":4922},"completion\_tokens\_details":{"reasoning\_tokens":0,"audio\_tokens":0,"text\_tokens":68}}} {"code":0,"message":"End","data":null}

```
                      
                      {"code":11,"message":"MessageInfo","data":{"message_id":"67b857b6be1f2906861a5e75"}}
{"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"你好"}}
{"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"，请"}}
{"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"问"}}
{"code":39,"message":"Audio","data":{"audioAnswer":"","transcript":"有什么"}}
{"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}}
{"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}}
{"code":39,"message":"Audio","data":{"audioAnswer":"EQAUAA0...IA3bi","transcript":""}}
{"code":10,"message":"FlowOutput","data":[{"content":" Audio:https://gptbots.ai/example.wav,Transcript:(Hello! How can I assist you today?)","audioDatas":[{"transcript":"Hello! How can I assist you today?","url":"https://gptbots.ai/example.wav","seconds":3}],"from_component_name":"AI Model-1"}],"componentId":12}{"code":4,"message":"Cost","data":{"prompt_tokens":4922,"completion_tokens":68,"total_tokens":4990,"prompt_tokens_details":{"audio_tokens":0,"text_tokens":4922},"completion_tokens_details":{"reasoning_tokens":0,"audio_tokens":0,"text_tokens":68}}}
{"code":0,"message":"End","data":null}

                    
```

此代码块在浮窗中显示

### 成功响应（webhook）

> ⚠️ **webhook**响应模式下，人工接管服务可用。  
> 当 Agent 配置了人工服务功能时，应该选择使用`webhook`响应模式才能接收到人工客服回复的消息。开发者在「集成-API」完成配置 webhook 地址后，GPTBots系统将向 Webhook 地址发送「Agent」和「人工客服」的响应消息。  
> ![webhook配置](https://res.srcgptbots.com/aigc/docs/20250513/040215080/image.png)  
> Webhook 消息详见 [Webhook模式](https://www.gptbots.ai/src/zh_CN/API%20Reference/%E5%AF%B9%E8%AF%9D%20API/Webhook%20V2.md) 和[人工接管服务](https://www.gptbots.ai/zh_CN/docs/api-reference/conversation-api/human-handoff-service)。

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message                               |
| ----- | ------------------------------------- |
| 40000 | 参数错误                              |
| 40127 | 开发者鉴权失败                        |
| 40356 | 会话不存在                            |
| 40358 | 会话ID与智能体或用户不匹配            |
| 40364 | 该 智能体 未使用支持图片模态的 大模型 |
| 50000 | 系统内部错误                          |
| 20040 | 超过问题长度限制                      |
| 20022 | 积分不足                              |
| 20055 | 禁止使用api功能,请确保API开关已经打开 |



## Webhook 模式

当前 GPTBots Agent 的消息响应模式支持:`blocking`,`streaming`和`webhook`三种方式。当开发者使用`webhook 模式` 接收 Agent 响应消息时， 会将`AI回复消息` 或 `人工客服回复消息`提交到指定的 webhook 地址。

| 响应模式  | 该模式所支持的消息回复类型      |
| --------- | ------------------------------- |
| blocking  | Agent回复消息                   |
| streaming | Agent回复消息                   |
| webhook   | 人工客服回复消息、Agent回复消息 |

## 请求方式

`POST`

## 调用地址

请在 Agent - 集成 - API - webhook 页面配置**你的消息接收地址**。

## 调用验证

详情参见 API 概述的鉴权方式说明。

## 请求

### 请求示例

curl -X POST 'YOUR\_API\_URL' \\ -H 'Authorization: Bearer ${API Key}' \\ -H 'Content-Type: application/json' \\ -d '{ "create\_time": 1679587005, "conversation\_id": "657303a8a764d47094874bbe", "message\_id": "65a4ccfC7ce58e728d5897e0", "output": \[ { "from\_component\_branch": "1", "from\_component\_name": "Component Name", "content": { "text": "Hi, is there anything I can help you?", "audio": \[ { "audio": "http://gptbots.ai/example.mp3", "transcript": "The transcribed content of the audio" } \] } } \], "usage": { "tokens": { "total\_tokens": 29, "prompt\_tokens": 19, "prompt\_tokens\_details": { "audio\_tokens": 0, "text\_tokens":0 }, "completion\_tokens": 10, "completion\_tokens\_details": { "reasoning\_tokens": 0, "audio\_tokens": 0, "text\_tokens": 0 } }, "credits": { "total\_credits":0.0, //prompt + completion "text\_input\_credits": 0.0, "text\_output\_credits": 0.0, "audio\_input\_credits": 0.0, "audio\_output\_credits": 0.0 } } }'

```
                      
                      curl -X POST 'YOUR_API_URL' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "create_time": 1679587005,
    "conversation_id": "657303a8a764d47094874bbe",
    "message_id": "65a4ccfC7ce58e728d5897e0",
    "output": [
        {
            "from_component_branch": "1",
            "from_component_name": "Component Name",
            "content": {
                "text": "Hi, is there anything I can help you?",
                "audio": [
                    {
                        "audio": "http://gptbots.ai/example.mp3",
                        "transcript": "The transcribed content of the audio"
                    }
                ]
            }
        }
    ],
    "usage": {
        "tokens": {
           "total_tokens": 29,
            "prompt_tokens": 19,
            "prompt_tokens_details": 
                {  
                    "audio_tokens": 0,
                    "text_tokens":0
                },
            "completion_tokens": 10,
            "completion_tokens_details": 
                {
                    "reasoning_tokens": 0,
                    "audio_tokens": 0,
                    "text_tokens": 0
                }
        },
        "credits": {
            "total_credits":0.0,  //prompt + completion
            "text_input_credits": 0.0,
            "text_output_credits": 0.0,
            "audio_input_credits": 0.0,
            "audio_output_credits": 0.0
        }
    }
}'

                    
```

此代码块在浮窗中显示

### 请求头

| 字段          | 类型                     | 描述                                                         |
| ------------- | ------------------------ | ------------------------------------------------------------ |
| Authorization | Bearer or Basic ${token} | 若开发者启用鉴权，使用 Authorization: Bearer OR Basic ${token}进行调用验证，否则可不填写。 |
| Content-Type  | application/json         | 数据类型，取值为 application/json。                          |

### 请求参数

| 字段                        | 类型       | 描述                                                         |
| --------------------------- | ---------- | ------------------------------------------------------------ |
| conversation\_id            | string     | 对话的唯一标识符                                             |
| message\_id                 | string     | 一条对话中，某条消息的唯一标识符。                           |
| create\_time                | long       | 回复的这条消息产生的时间戳。                                 |
| output                      | JSON Array | AI Agent 回复内容。                                          |
| from\_component\_branch     | string     | FlowAgent 分支。                                             |
| from\_component\_name       | string     | FlowAgent 上游组件名称。                                     |
| content                     | object     | AI Agent回复的消息内容，当前包含了`text`和 `audio` 2 个类型的消息。 |
| usage                       | object     | 使用消耗。                                                   |
| tokens                      | JSON Array | 本次对话该 Agent 所消耗的总 tokens。                         |
| total\_tokens               | integer    | 本次对话 input + output 所消耗的总 tokens。                  |
| prompt\_tokens              | integer    | 本次对话 input 所消耗的总 tokens。                           |
| completion\_tokens          | integer    | 本次对话 output 所消耗的总 tokens。                          |
| prompt\_tokens\_details     | object     | 本次对话 input Token 消耗明细。                              |
| completion\_tokens\_details | object     | 本次对话 output Token 消耗明细。                             |
| credits                     | object     | 本次对话该 Agent 所消耗的总积分。。                          |
| text\_input\_credits        | double     | 本次对话 input text message 所消耗的积分。                   |
| text\_output\_\_credits     | double     | 本次对话 output text message 所消耗的积分。                  |
| audio\_input\_credits       | double     | 本次对话 input audio message 所消耗的积分。                  |
| audio\_output\_credits      | double     | 本次对话 input audio message 所消耗的积分。                  |

## 响应

### 响应示例

## 获取对话列表

获取指定筛选条件范围内，Agent 所有对话的 `conversation_id`、`user_id`、最近对话时间、对话主题、对话类型、对话内的消息总数、消耗积分数等信息。

## 请求方式

`GET`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v1/bot/conversation/page`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |

### 请求参数

| 字段               | 类型   | 必填 | 描述                                                         |
| ------------------ | ------ | ---- | ------------------------------------------------------------ |
| conversation\_type | string | 是   | 对话ID来源类型，可设置为:`ALL`、`API`、`EMBED`等多个来源类型。 |
| user\_id           | string | 否   | User ID。若不填写，则视为不限制。                            |
| start\_time        | long   | 是   | 最近对话时间（开始），时间戳。                               |
| end\_time          | long   | 是   | 最近对话时间（结束），时间戳。                               |
| page               | int    | 是   | 页码数，即需要请求第几页，从 1 开始。                        |
| page\_size         | int    | 是   | 每页的数据量，范围 1-100。                                   |

> 注意：conversation\_type 的取值详见[用户概述](https://www.gptbots.ai/zh_CN/docs/api-reference/user-api/user-overview)的表格中的**对话ID（conversation\_id）来源字段值列表**。

## 响应

### 响应示例

{ "list": \[ { "conversation\_id": "AaACmo05Yrqb6bOSTbsg", "user\_id": "3", "recent\_chat\_time": 1694572952383, "subject": "2+3=?", "conversation\_type": "API", "message\_count": 2, "cost\_credit": 0.01, "bot\_id": "64b902a84f1ff25d1c60c10b" }, { "conversation\_id": "64ec1508c9c1ed5605e6ff28", "user\_id": "33", "recent\_chat\_time": 1693194862160, "subject": "Hello!", "conversation\_type": "API", "message\_count": 20, "cost\_credit": 0.59, "bot\_id": "64b902a84f1ff25d1c60c10b" } \], "total": 2 }

```
                      
                      {
  "list": [
    {
      "conversation_id": "AaACmo05Yrqb6bOSTbsg",
      "user_id": "3",
      "recent_chat_time": 1694572952383,
      "subject": "2+3=?",
      "conversation_type": "API",
      "message_count": 2,
      "cost_credit": 0.01,
      "bot_id": "64b902a84f1ff25d1c60c10b"
    },
    {
      "conversation_id": "64ec1508c9c1ed5605e6ff28",
      "user_id": "33",
      "recent_chat_time": 1693194862160,
      "subject": "Hello!",
      "conversation_type": "API",
      "message_count": 20,
      "cost_credit": 0.59,
      "bot_id": "64b902a84f1ff25d1c60c10b"
    }
  ],
  "total": 2
}

                    
```

此代码块在浮窗中显示

### 成功响应

| 字段               | 类型       | 描述               |
| ------------------ | ---------- | ------------------ |
| list               | JSON Array | 对话列表。         |
| conversation\_id   | string     | 对话 ID。          |
| user\_id           | string     | 用户 ID。          |
| recent\_chat\_time | long       | 最近对话时间。     |
| subject            | string     | 对话主题。         |
| conversation\_type | string     | 对话类型。         |
| message\_count     | int        | 对话内的消息总数。 |
| cost\_credit       | float      | 对话的消耗积分数。 |
| bot\_id            | string     | Agent ID。         |
| total              | int        | 返回的对话数。     |

### 失败响应

| 字段    | 类型   | 描述     |
| ------- | ------ | -------- |
| code    | int    | 错误码   |
| message | string | 错误详情 |

### 错误码

| Code  | Message      |
| ----- | ------------ |
| 40000 | 参数错误     |
| 20059 | Agent 已删除 |



## 获取对话的消息明细

根据入参的 `conversation_id` ，获取该条对话内的所有消息内容明细，包含`message_id`、用户问题、消息类型、消息内容、消息产生时间等信息。

## 请求方式

`GET`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v2/messages`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |

### 请求参数

| 字段             | 类型   | 必填 | 描述                                                      |
| ---------------- | ------ | ---- | --------------------------------------------------------- |
| conversation\_id | string | 是   | 对话标识符。                                              |
| page             | int    | 是   | 页数，表示你想请求第几页的数据。                          |
| page\_size       | int    | 是   | 每页的数据量，表示你希望每页返回多少条数据，最多 100 条。 |

## 响应

### 响应示例

{ "total": 2, "conversation\_content": \[ { "message\_id": "645dd86906931c4a9e0ffb1f", "parent\_message\_id": "545dd86906931c4a9e0ffb1f", "create\_time": 1683871849906, "role": "user", "content": \[ { "branch\_content": \[ { "type": "text", "text": "I have uploaded 2 image files, please OCR and return 2 json records." }, { "type": "image", "image": \[ { "url": "https://gptbots.ai/example.png", "format": "jpeg", "name": "TAXI1", "size": 1024 }, { "url": "https://gptbots.ai/example.png", "format": "png", "name": "TAXI2", "size": 1024 } \] }, { "type": "audio", "audio": \[ { "url": "https://gptbots.ai/example.mp3", "format": "mp3", "name": "example1 audio", "size": 1024 } \] }, { "type": "document", "document": \[ { "url": "https://gptbots.ai/example.pdf", "format": "pdf", "name": "example pdf", "size": 1024 } \] } \] } \] }, { "message\_id": "745dd86906931c4a9e0ffb1f", "parent\_message\_id": "645dd86906931c4a9e0ffb1f", "create\_time": 1683871849906, "role": "assistant", "content": \[ { "from\_component\_branch": "1", "branch\_content": \[ { "type": "text", "text": "Hi, is there anything I can help you?", }, { "type": "audio", "audio": \[ { "url": "http://gptbots.ai/example.mp3", "transcript": "音频所转录的文字内容" } \] }, \] }, { "from\_component\_branch": "2", "branch\_content": \[ { "type": "document", "document": \[ { "url": "https://gptbots.ai/example.pdf", "format": "pdf", "name": "example pdf" } \] }, { "type": "image", "image": \[ { "url": "https://gptbots.ai/example.png", "format": "png", "name": "TAXI2" } \] } \] } \] } \] }

```
                      
                      {
  "total": 2,
  "conversation_content": [
    {
      "message_id": "645dd86906931c4a9e0ffb1f",
      "parent_message_id": "545dd86906931c4a9e0ffb1f",
      "create_time": 1683871849906,
      "role": "user",
      "content": [
        {
            "branch_content": [
                {
                    "type": "text",
                    "text": "I have uploaded 2 image files, please OCR and return 2 json records."
                },
                {
                    "type": "image",
                    "image": [
                        {
                            "url": "https://gptbots.ai/example.png",
                            "format": "jpeg",
                            "name": "TAXI1",
                            "size": 1024
                        },
                        {
                            "url": "https://gptbots.ai/example.png",
                            "format": "png",
                            "name": "TAXI2",
                            "size": 1024
                        }
                    ]
                },
                {
                    "type": "audio",
                    "audio": [
                        {
                            "url": "https://gptbots.ai/example.mp3",
                            "format": "mp3",
                            "name": "example1 audio",
                            "size": 1024
                        }
                    ]
                },
                {
                    "type": "document",
                    "document": [
                        {
                            "url": "https://gptbots.ai/example.pdf",
                            "format": "pdf",
                            "name": "example pdf",
                            "size": 1024
                        }
                    ]
                }
            ]
        }
      ]
    },
    {
      "message_id": "745dd86906931c4a9e0ffb1f",
      "parent_message_id": "645dd86906931c4a9e0ffb1f",
      "create_time": 1683871849906,
      "role": "assistant",
      "content": [
        {
            "from_component_branch": "1",
            "branch_content": [
                  {
                    "type": "text",
                    "text": "Hi, is there anything I can help you?",
                  },
                  {
                    "type": "audio",
                    "audio": [
                    {
                        "url": "http://gptbots.ai/example.mp3",
                        "transcript": "音频所转录的文字内容"
                    }
                    ]
                  },
            ]
        },
        {
            "from_component_branch": "2",
            "branch_content": [
                  {
                    "type": "document",
                    "document": [
                        {
                            "url": "https://gptbots.ai/example.pdf",
                            "format": "pdf",
                            "name": "example pdf"
                        }
                    ]
                  },
                  {
                    "type": "image",
                    "image": [
                        {
                            "url": "https://gptbots.ai/example.png",
                            "format": "png",
                            "name": "TAXI2"
                        }
                    ]
                  }
            ]
        }
      ]
    }
  ]
}

                    
```

此代码块在浮窗中显示

### 成功响应

| 字段                    | 类型       | 描述                                                         |
| ----------------------- | ---------- | ------------------------------------------------------------ |
| total                   | string     | 本对话中的消息总数。                                         |
| conversation\_content   | JSON Array | 消息详情。                                                   |
| message\_id             | string     | 消息的唯一标识。                                             |
| parent\_message\_id     | string     | 本消息的父消息的唯一标识。                                   |
| create\_time            | long       | 这条消息产生的时间戳。                                       |
| role                    | string     | 消息角色，取值：user、assistant。                            |
| content                 | JSON Array | 消息内容。                                                   |
| from\_component\_branch | string     | 消息来源的组件分支ID,当用户发送消息和普通Agent该字段**为空**。 |
| branch\_content         | JSON Array | 消息分支内容。                                               |
| type                    | string     | 消息内容类型，取值：text、image、audio、document、video、file。 |
| text                    | string     | 文本消息内容。                                               |
| image                   | JSON Array | 图片消息内容。                                               |
| audio                   | JSON Array | 音频消息内容。                                               |
| document                | JSON Array | 文档消息内容。                                               |
| video                   | JSON Array | 视频消息内容。                                               |
| file                    | JSON Array | 文件消息内容。                                               |

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message                  |
| ----- | ------------------------ |
| 40000 | 参数错误                 |
| 40005 | 分页参数不能大于实际数量 |
| 40127 | 开发者鉴权失败           |
| 40356 | 会话不存在               |
| 20059 | Agent 已删除             |



## 生成建议问题

基于某轮对话中 Agent 的回复消息，为用户提供几个可用于继续聊天的问题。

## 请求方式

`GET`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v1/next/question`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |

### 请求参数

| 字段       | 类型   | 必填 | 描述                  |
| ---------- | ------ | ---- | --------------------- |
| answer\_id | string | true | Agent 回复的消息 ID。 |

## 响应

### 响应示例

### 成功响应

| 字段      | 类型  | 描述             |
| --------- | ----- | ---------------- |
| questions | Array | 生成的建议问题。 |

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code   | Message                 |
| ------ | ----------------------- |
| 40000  | 参数错误                |
| 40379  | 积分不足                |
| 200222 | Bot设置不支持下一步问题 |
| 40378  | Bot已删除               |
| 20055  | 禁止使用 API 功能       |
| 40127  | 开发者鉴权失败          |



## 获取回答引用知识

获取 Agent 回答所引用的知识库切片数据，包括了切片内容、切片所属文档ID、文档名称、来源 URL、相关性得分等。

## 请求方式

`GET`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v1/correlate/dataset`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |

### 请求参数

| 字段        | 类型   | 必填 | 描述                  |
| ----------- | ------ | ---- | --------------------- |
| message\_id | string | true | Agent 回复的消息 ID。 |

## 响应

### 响应示例

{ "conversation\_id": "65dc320df07244300b25b993", "question\_id": "65dc323ef07244300b25b9c5", "answer\_id": "65dc323ef07244300b25b9c6", "correlate\_dataset": \[ { "content": "\[中国的历史\]中国第一位女皇帝是武则天。", "data\_id": "65dc3234f07244300b25b9b9", "data\_name": "中国的历史", "source\_url": "https://www.example.com/chinese-history", "score": 0.93492633 } \] }

```
                      
                      {
    "conversation_id": "65dc320df07244300b25b993",
    "question_id": "65dc323ef07244300b25b9c5",
    "answer_id": "65dc323ef07244300b25b9c6",
    "correlate_dataset": [
        {
            "content": "[中国的历史]中国第一位女皇帝是武则天。",
            "data_id": "65dc3234f07244300b25b9b9",
            "data_name": "中国的历史",
            "source_url": "https://www.example.com/chinese-history",
            "score": 0.93492633
        }
    ]
}

                    
```

此代码块在浮窗中显示

### 成功响应

| 字段               | 类型       | 描述                       |
| ------------------ | ---------- | -------------------------- |
| conversation\_id   | string     | 会话 ID                    |
| question\_id       | string     | 问题 ID                    |
| answer\_id         | string     | Agent 回答 ID              |
| correlate\_dataset | JSON Array | 引用的知识数据             |
| content            | string     | 知识切片内容               |
| data\_id           | string     | 知识文档 ID                |
| data\_name         | string     | 知识文档名称               |
| source\_url        | string     | 知识文档来源 URL           |
| score              | string     | 知识切片与问题的语义相关性 |

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code   | Message                |
| ------ | ---------------------- |
| 40000  | 参数错误               |
| 40379  | 积分不足               |
| 200222 | Agent 不支持文档相关性 |
| 40378  | Agent 已删除           |
| 20055  | 禁止使用 API 功能      |
| 40127  | 开发者鉴权失败         |



## Agent 回复反馈

支持 Agent 的**用户**对 Agent 的生成内容进行反馈，以帮助 Agent 开发者优化。

## 请求方式

`POST`

## 调用地址

`https://api-${endpoint}.gptbots.ai/v1/message/feedback`

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API%20%E6%96%87%E6%A1%A3/%E6%A6%82%E8%BF%B0.md)的鉴权方式说明。

## 请求

### 请求示例

### 请求头

| 字段          | 类型              | 描述                                                         |
| ------------- | ----------------- | ------------------------------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |
| Content-Type  | application/json  | 数据类型，取值为`application/json`。                         |

### 请求参数

| 字段                                    | 类型   | 必填 | 描述                  |
| --------------------------------------- | ------ | ---- | --------------------- |
| answer\_id                              | string | 是   | Agent 回复的消息 ID。 |
| feedback                                | string | 是   | 对 Agent 回复的反馈。 |
| \- POSITIVE：积极、喜欢、点赞、认可     |        |      |                       |
| \- NEGATIVE：消极、不喜欢、点倒、不认可 |        |      |                       |
| \- CANCELED：取消反馈                   |        |      |                       |

## 响应

### 响应示例

### 成功响应

| 字段        | 类型 | 描述                               |
| ----------- | ---- | ---------------------------------- |
| affectCount | long | 本次反馈的成功数。成功反馈则为 1。 |

### 失败响应

| 字段    | 类型   | 描述       |
| ------- | ------ | ---------- |
| code    | int    | 错误码。   |
| message | string | 错误详情。 |

### 错误码

| Code  | Message        |
| ----- | -------------- |
| 40000 | 参数错误       |
| 40127 | 开发者鉴权失败 |
| 20059 | Agent 已删除   |



## 人工服务

当开发者选择**Webhook 作为人工服务接入方式**时，首先需要在自己的服务器环境构建一个 Webhook 服务，**开发者需要按规范提供以下3个接口**用于接收人工服务请求、接收用户消息和人工客服回复消息。GPTBots 同时提供了2个接口用于接收客服回复消息和对话关闭指令。

**注意事项：**

1.  开发者应确保 Webhook 服务正常可用，否则会影响人工服务的正常使用。

2.  当成功发起人工服务请求后，

## 接收人工服务对话请求通知

当终端用户发起人工服务请求时，GPTBots将该请求透传给开发者的 Webhook 服务，开发者接口服务返回`200`则代表创建人工服务成功。

### 请求方式

`POST`

### 调用地址

`https://your_domain/conversation/establish`

### 请求示例

curl -X POST 'https://YOUR\_DOMAIN/human/service/conversation/establish' \\ -H "Content-Type: application/json" \\ -d '{ "body": \[ { "text": "human service", "message\_type": "QUESTION" }, { "text": "content", "message\_type": "ANSWER" } \], "timestamp": 1742265090895, "email": "bob@gmail.com", "conversation\_id": "67d8db020fa31d1ef64f53dg", "bot\_id": "665d88b03ce2b13cf2d573454", "user\_info": { "phone": null, "email": "bob@gmail.com", "user\_id": "KDslas", "anonymous\_id": "652face5184b30540a6ea7fe" } }'

```
                      
                      curl -X POST 'https://YOUR_DOMAIN/human/service/conversation/establish' \
-H "Content-Type: application/json" \
-d '{
  "body": [
    {
      "text": "human service",
      "message_type": "QUESTION"
    },
    {
      "text": "content",
      "message_type": "ANSWER"
    }
  ],
  "timestamp": 1742265090895,
  "email": "bob@gmail.com",
  "conversation_id": "67d8db020fa31d1ef64f53dg",
  "bot_id": "665d88b03ce2b13cf2d573454",
  "user_info": {
    "phone": null,
    "email": "bob@gmail.com",
    "user_id": "KDslas",
    "anonymous_id": "652face5184b30540a6ea7fe"
  }
}'

                    
```

此代码块在浮窗中显示

> 注意：该请求体中的`conversation_id` 仅用于标识人工服务对话场景的惟一ID，区别于 [创建对话ID](https://www.gptbots.ai/zh_CN/docs/api-reference/conversation-api/create-conversation) 为Agent对话场景所生成的惟一ID。

### 请求头

| 字段         | 类型             | 描述                                |
| ------------ | ---------------- | ----------------------------------- |
| Content-Type | application/json | 数据类型，取值为 application/json。 |

### 请求参数

| 参数                     | 类型         | 说明                                                         |
| ------------------------ | ------------ | ------------------------------------------------------------ |
| conversation\_id         | string       | 人工客服场景的会话id（区别与Agent对话场景的会话id），在客服回复接口需要透传给GPTBots |
| timestamp                | long         | 时间戳                                                       |
| email                    | string       | 用户邮箱，部分人工服务系统必须提供邮箱方可正常提供服务       |
| bot\_id                  | string       | Agent（原 bot）的id                                          |
| body                     | list<Object> | 消息体                                                       |
| body.message\_type       | string       | 消息类型，QUESTION/ANSWER                                    |
| body.text                | string       | 客户发起人工客服的问题以及上下文                             |
| user\_info               | object       | 用户信息                                                     |
| user\_info.phone         | string       | 用户的手机号码，目前只在whatsapp转人工客服的时候有值         |
| user\_info.email         | string       | 用户的邮箱，在用户输入邮箱时有值                             |
| user\_info.user\_id      | string       | 用户ID。企业开发者自定义的用户身份唯一标识ID，由开发者自行为某个匿名 ID设置 UserId |
| user\_info.anonymous\_id | string       | 匿名 ID。用户在非 API 的渠道平台与 Agent 发起对话时，系统会根据用户所在的渠道平台，为用户生成包含所在渠道平台信息的匿名 ID |

> `email` 字段使用注意事项：

### 响应

| 参数    | 类型   | 说明   |
| ------- | ------ | ------ |
| code    | int    | 响应码 |
| message | string | 详情   |

## 聊天接口

通过创建的`conversation_id`，将用户的消息发送给人工客服。

### 请求方式

`POST`

### 调用地址

[https://your\_domain/chat](https://your_domain/chat)

### 请求参数

| 参数             | 类型   | 说明                                     |
| ---------------- | ------ | ---------------------------------------- |
| conversation\_id | string | 对话ID，在客服回复接口需要透传给 GPTBots |
| timestamp        | long   | 时间戳                                   |
| body             | string | 用户的消息                               |

### 响应

| 参数    | 类型   | 说明   |
| ------- | ------ | ------ |
| code    | int    | 响应码 |
| message | string | 详情   |

## 关闭会话接口

用户对话超时或者 Agent 用户主动关闭对话时，调用此接口关闭会话

### 请求方式

`POST`

### 调用地址

[https://your\_domain/conversation/close](https://your_domain/conversation/close)

### 请求参数

| 参数             | 类型   | 说明                                                        |
| ---------------- | ------ | ----------------------------------------------------------- |
| conversation\_id | string | 对话ID，在客服回复接口需要透传给 GPTBots                    |
| timestamp        | long   | 时间戳                                                      |
| type             | string | 关闭的类型、TIMEOUT（超时关闭）/ USER\_CLOSED(用户主动关闭) |

### 响应

| 参数    | 类型   | 说明     |
| ------- | ------ | -------- |
| code    | int    | 响应码， |
| message | string | 详情     |

## 回复用户消息

开发者选择`webhook`作为人工服务接入方式时，GPTBots 提供用于回复用户消息的接口，可将人工客服所发送的消息内容发送给用户。

### 请求方式

`POST`

### 调用地址

[https://api.gptbots.ai/v1/human/message/receive](https://api.gptbots.ai/v1/human/message/receive)

### 请求参数

| 参数             | 类型   | 说明                                           | required |
| ---------------- | ------ | ---------------------------------------------- | -------- |
| conversation\_id | string | 对话ID，在对话创建接口和聊天接口有传，透传即可 | true     |
| timestamp        | long   | 时间戳                                         | true     |
| body             | string | 人工客服的回复内容                             | true     |

### 响应

| 参数    | 类型   | 说明     |
| ------- | ------ | -------- |
| code    | int    | 响应码， |
| message | string | 详情     |

## 人工客服关闭会话

开发者选择`webhook`作为人工服务接入方式时，GPTBots 提供的人工客服在需要时可以选择主动关闭对话的接口，关闭后用户将不能再接收到客服的消息，除非用户重新发起人工客服对话。

### 请求方式

`POST`

### 调用地址

[https://api.gptbots.ai/v1/human/close](https://api.gptbots.ai/v1/human/close)

### 请求参数

| 参数             | 类型   | 说明                                      |
| ---------------- | ------ | ----------------------------------------- |
| conversation\_id | string | 对话 ID，在客服回复接口需要透传给 GPTBots |
| timestamp        | long   | 时间戳                                    |

### 响应

| 参数             | 类型   | 说明                                           | required |
| ---------------- | ------ | ---------------------------------------------- | -------- |
| conversation\_id | string | 对话ID，在会话创建接口和聊天接口有传，透传即可 | true     |
| timestamp        | long   | 时间戳                                         | true     |

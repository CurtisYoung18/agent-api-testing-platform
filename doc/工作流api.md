运行工作流

 最新更新：大约 8 小时内

启用工作流 API 且创建 APIkey 后，您可以通过 API 方式入参以运行工作流，并获取工作流的执行结果。

## 请求方式

```
POST
```

## 调用地址

```
https://api-${endpoint}.gptbots.ai/v1/workflow/invoke
```

## 调用验证

详情参见 [API 概述](https://www.gptbots.ai/src/zh_CN/API 文档/概述.md)的鉴权方式说明。

## 请求

### 请求示例

```
curl -X POST 'https://api-${endpoint}.gptbots.ai/v1/workflow/invoke' \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
    "userId": "<your_user_id>",
    "input": {
        <your_start>
    }
}'
```

### 请求头

| 字段          | 类型              | 是否必填                                                     | 说明                                  |
| :------------ | :---------------- | :----------------------------------------------------------- | :------------------------------------ |
| Authorization | Bearer ${API Key} | 使用`Authorization: Bearer ${API Key}`进行调用验证，请在 API 密钥页面获取密钥作为`API Key`。 |                                       |
| Content-Type  | application/json  | 是                                                           | 数据类型，固定值为 `application/json` |

### 请求参数

| 字段   | 类型   | 必填 | 说明                                                         |
| :----- | :----- | :--- | :----------------------------------------------------------- |
| userId | string | 否   | 用于标记本次请求的用户ID。                                   |
| input  | object | 是   | 即工作流的“开始”节点。该对象内需填入与工作流“开始”节点内配置的完全一致的入参结构。 |

## 响应

### 响应示例

```
{
    "workflowId": "xxxxxxxx",
    "workflowName": "todayNews",
    "workflowVersion": "9",
    "workflowRunId": "xxxxxxxx",
    "input": {
        "topic": "hi"
    },
    "output": {
        "news": [
            {
                "summary": "Fatal crash shuts down major highway in Haleiwa. According to Emergency Medical Services, paramedics responded to the scene of the crash Wednesday morning.",
                "media": "Hawaii News Now",
                "title": "Hawaii News Now - Breaking News, Latest News, Weather & Traffic"
            },
            {
                "summary": "Hawaii Crime: Man, 65, critically injured in Waikīkī assault. Jamil Hart found guilty in Mililani murder case. HPD busts illegal gambling room in Nanakuli.",
                "media": "KHON2",
                "title": "KHON2: Hawaii News, Weather, Sports, Breaking News & Live"
            },
            {
                "summary": "Man left with serious injuries after being hit by car in Hawaii Kai. Holomua brush fire 50% contained; 380 acres burned. Haleiwa collision claims one life.",
                "media": "KITV 4",
                "title": "KITV 4 Island News | Honolulu, HI News & Weather"
            },
            {
                "summary": "Hawaii news daily. In-depth reporting on breaking news and more for Honolulu, Big Island, Maui and Kauai counties. No paywall.",
                "media": "Honolulu Civil Beat",
                "title": "Hawaii News: In-Depth Local News From Honolulu Civil Beat"
            },
            {
                "summary": "Breaking News: Man, 21, dies in crash on J.P. Leong Highway in Haleiwa. Gunman inscribed 'ANTI-ICE' on bullet before fatal Dallas attack. Man, 44, dies after...",
                "media": "Honolulu Star-Advertiser",
                "title": "Honolulu Star-Advertiser: Hawaii News, Breaking News & Top Stories"
            }
        ]
    },
    "workflowExecutionTime": 8347,
    "status": "SUCCEED",
    "totalCost": 0.6928,
    "totalTokens": 1745,
    "startTime": 1758765323024,
    "endTime": 1758765331373
}
```

### 响应参数

| 字段                  | 类型   | 说明                                                         |
| :-------------------- | :----- | :----------------------------------------------------------- |
| workflowId            | string | 工作流 ID。                                                  |
| workflowName          | string | 工作流名称。                                                 |
| workflowVersion       | string | 工作流版本号。                                               |
| workflowRunId         | string | 工作流运行 ID，用于唯一标识本次执行。                        |
| input                 | object | “开始”节点的输入内容，与请求中的 input 相同。                |
| output                | object | “结束”节点的输出内容，包含工作流执行的结果。                 |
| workflowExecutionTime | number | 工作流执行耗时，单位为毫秒。                                 |
| status                | string | 工作流的调用状态，可能的值包括： * SUCCED：成功 * FAILED：失败 * RUNNING：运行中 |
| totalCost             | number | 总消耗费用（所有节点总和），单位为积分。                     |
| totalTokens           | number | 总消耗 Token 数（所有节点总和）。                            |
| startTime             | number | 开始时间戳，毫秒级。                                         |
| endTime               | number | 结束时间戳，毫秒级。                                         |
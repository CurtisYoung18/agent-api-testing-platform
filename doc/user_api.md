用户概述
 最新更新：21 天前
用户是指 Agent 发起对话的终端用户，GPTBots 支持开发者为不同用户设置唯一身份标识ID，通过该用户IDuser_id可以在不同渠道之间进行用户 身份关联，实现跨渠道用户身份合并、 通过 Tools 实现业务业务查询、维护用户属性和聊天记录等功能。

定义
用户
用户是指与 Agent 产生对话的终端用户。

用户ID（user_id）
由企业开发者为终端用户所赋予的身份唯一标识ID，通过 API 接口支持开发者为某个匿名ID设置UserId。UseId 的使用场景和高级用法请参考设置用户ID。

user_id级别高于anonymous_id
多个anonymous_id可以同时属于一个user_id。
匿名ID（anonymous_id）
用户在三方平台（如：Telegram、WhatsApp、LINE等）与 Agent 进行对话时，GPTBots 会使用该三方平台的用户惟一标识符作为anonymous_id。 匿名ID的生成逻辑请参考[匿名ID取值逻辑](## 匿名ID取值逻辑)。

三方平台
GPTBots 平台当前支持将 Agent 集成至众多三方平台，包含：intercom 、webchat、 livechat 、 telegram 、 WhatsApp 等

对话ID（conversation_id）
对话ID（conversation_id）由 Agent、对话类型和 user_id（anonymous_id）所共同生成的惟一标识ID，conversationID是不同业务场景隔离的最小单位（通常包含多个消息ID）。

conversationID 的自动过期时间为 60分钟,但通过 API 渠道生成的conversationID 没有过期时间。
三方平台和部件气泡等渠道所生成的conversationID在过期后会再次生成一个全新的conversationID开启一轮新对话。
消息ID（message_id）
消息ID 即messageID用于标识 Agent 与用户的一次对话消息，是 Agent 与用户的一次对话的最小单位。

messageID 是由 GPTBots 平台生成的，开发者无法自定义messageID。
messageID 归属于conversationID，一个 conversationID通常包含多个messageID。
对话类型
对话类型（conversation_type）用于标识用户发起对话场景，如：工作空间-Workflow、WhatsApp、API、工作空间-Search 等。

对话ID（conversation_id）的生成原理
当用户通过三方平台与 Agent 发起对话时，系统会根据用户所在的三方平台，为用户生成的匿名ID，并基于匿名ID自动生成conversationID用于承载用户与 Agent 的一轮对话。

开发者通过 API 方式使用时，必须先生成conversationID，再传入conversationID参数方可发起与 Agent 的对话。
非 API 的其他渠道平台，GPTBots 会自动生成conversationID，生成的具体业务流程如下：
alt text
匿名ID 取值逻辑
匿名ID来源平台	匿名ID取值逻辑	对应来源平台字段	说明
Telegram	Telegram用户ID	tg_user_id	Telegram 用户的唯一数字标识符，用于区分不同用户
Telegram 群聊	Telegram chatID + Telegram 用户ID	tg_chat_id + tg_user_id	群聊的聊天会话标识符与用户标识符的组合，用于在群组环境中唯一标识用户互动
LINE	LINE 用户ID	line_user_id	LINE 用户的唯一标识符，用于识别平台内的个体用户
LiveChat	LiveChat threadId	lc_thread_id	LiveChat 会话线程的唯一标识符，用于跟踪和管理用户对话线程
Slack	Slack 用户ID	slack_user_id	Slack 用户的唯一标识符，用于识别平台内的个体用户
Slack Public Channel	Slack(teamId+channelId+UserId)	slack_team_id + slack_channel_id + slack_user_id	Slack 团队标识符、公共频道标识符与用户标识符的组合，用于在公共频道中唯一标识用户
Intercom	Intercom用户ID	intercom_user_id	Intercom 用户的唯一标识符，用于客户支持平台中的用户追踪和管理
钉钉	钉钉 senderId	dd_user_id	钉钉用户的唯一标识符，用于企业协作平台中的用户区分
钉钉群聊	钉钉(senderId+群聊ID)	dd_chat_id + dd_senderId	钉钉分配给消息发送者的唯一标识符、群聊的唯一标识符，用于企业协作平台中的用户区分
WhatsApp by meta	WhatsApp 用户 ID	wa_user_id	WhatsApp 用户的唯一标识符，通常基于用户的手机号码（例如，国际格式手机号码后缀@c.us）
WhatsApp by EngageLab	WhatsApp 用户 ID	wa_user_id	WhatsApp 用户的唯一标识符，通常基于用户的手机号码（例如，国际格式手机号码后缀@c.us）
Discord	Discord用户ID	discord_user_id	Discord 用户的唯一数字标识符，用于游戏和社区平台中的用户识别
Instagram	Instagram senderId	instagram_user_id	Instagram 分配给消息发送者（即 Instagram 用户）的唯一标识符
Facebook	senderId	facebook_user_id	Facebook 分配给消息发送者（即 Instagram 用户）的唯一标识符
sobot	Sobot memberId	sobot_memberId	sobot 用户 ID
Sobot 群聊@用户	Sobot(guildId + channelId + memberId)	guildId + channelId + memberId	Sobot 群聊@用户的唯一标识符，用于在群聊环境中唯一标识用户互动
Intercom	senderId	intercom_senderId	Intercom 用户 ID
Zoho Sales IQ	zoho conversationId	zoho_sales_iq_conversationId	Zoho Sales IQ 的对话惟一标识符
微信客服	微信客服用户ID	wechat_customer_service_user_id	微信客服 用户 ID
GPTBots内置渠道匿名ID（anonymous_id）取值逻辑
集成渠道	匿名ID取值逻辑	说明
API	无匿名ID	用户仅可使用user_id生成对话ID
工作空间	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
分享	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
Iframe	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
AI搜索	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
AI搜索（iframe）	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
Widget	匿名ID=浏览器指纹ID	基于浏览器指纹生成随机ID，清除缓存或无痕模式下可能会生成新的ID
当用户已登录 GPTBots 平台时，系统自动将其 GPTBots账户ID设置为user_id，并自动关联anonymous_id（浏览器指纹ID）。

对话类型
对话类型（conversation_type）用于标识用户发起对话场景，通过conversation_type字段值可以分场景查询日志数据。

对话类型	字段值	说明
全部	ALL	全部类型来源的对话ID
工作空间-Search	C	工作空间Agent产生的对话ID
工作空间-Agent	CHAT	工作空间Search产生的对话ID
工作空间-Workflow	C_WORKFLOW	工作空间 Workflow 产生的对话ID
工作空间-Apps	C_APPS	工作空间 Market 各类 AI 应用产生的对话ID
API	API	API调用产生的对话ID
Iframe	EMBED	Iframe产生的对话ID
部件气泡	WIDGET	部件气泡产生的对话ID
AI搜索	AI_SEARCH	AI搜索产生的对话ID
分享	SHARE	分享产生的对话ID
WhatsApp by Meta	WHATSAPP_META	WhatsApp by Meta产生的对话ID
WhatsApp by EngageLab	WHATSAPP_ENGAGELAB	WhatsApp by EngageLab产生的对话ID
钉钉机器人	DINGTALK	钉钉机器人产生的对话ID
Discord	DISCORD	Discord产生的对话ID
Slack	SLACK	Slack产生的对话ID
Zapier	ZAPIER	Zapier产生的对话ID
微信客服	WXKF	微信客服产生的对话ID
Telegram	TELEGRAM	Telegram产生的对话ID
LiveChat	LIVECHAT	LiveChat产生的对话ID
LINE	LINE	LINE产生的对话ID，若存在多个LINE Channel，则会有多个Channel选项
Instagram	INSTAGRAM	Instagram产生的对话ID
Facebook	FACEBOOK	Facebook产生的对话ID
Sobot	SO_BOT	Sobot产生的对话ID
Zoho Sales IQ	ZOHO_SALES_IQ	Zoho Sales IQ产生的对话ID
Intercom	INTERCOM	Intercom产生的对话ID
⚠️ 注意：表格中的字段值，可用于通过 API获取对话列表数据的筛选条件。
如 LINE、Telegram 等支持添加多个通道的三方平台，「Agent-日志」进行筛选对话类型会支持 2 级类型。
表格中的字段值，可在更新用户ID API中作为anonymous_id_source字段的值。
设置用户ID
 最新更新：30 天前
GPTBots 支持开发者在不同渠道（如：网站、APP 、LiveChat ）为 Agent 用户设置唯一身份ID，通过该用户ID(UserId) 可以在不同渠道之间进行用户 身份关联，实现跨渠道用户身份合并、 通过 Tools 实现业务业务查询、维护用户属性和聊天记录等。具体应用场景如下：

Tools： AI Agent 在调用 Tools 向开发者业务 API 发起请求时，会将 UserId 放在 Header 中，便于开发者识别用户身份。
用户属性：开发者设置 UserId 后，用户属性信息将被归属于该 UserId。
对话日志：开发者设置 UserId 后，用户与 Agent 的对话日志记录将被归属于该 UserId。
对话日志：开发者设置 UserId 后，用户与 Agent 的对话日志记录将被归属于该 UserId。
事件回调： 开发者设置 UserId 后，在 iframe/widget 中所产生的事件回调上报至GA4/webhook 时会携带该信息。
⚠️用户ID(UserId) 应是用户在开发者业务系统内的唯一身份标识。通过该 UserId 可以查询到该用户的 VIP 等级、用户标签、用户订单等业务数据信息。

API 设置用户ID
开发者通过 API 集成 Agent 能力为用户提供服务时，通常需要为不同的用户创建一个对话 ID（conversation_id） 作为提供 AI 服务的基础载体，创建converstation_id 的前提条件是必须设置一个用户ID 方可创建成功。

请求方式
POST

请求地址
https://api-${endpoint}.gptbots.ai/v1/conversation

请求示例
curl -X POST "https://api-${endpoint}.gptbots.ai/v1/conversation" \ 
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \ 
-d '{
      "user_id": "your_user_id"
}'
创建 conversation_id 的方法和具体指南请参考 创建对话。

Bubble Widget 设置用户ID
开发者使用 Bubble Widget 方式集成 Agent 至开发者网站提供服务时，可在网站用户处于登录状态时，通过调用 GPTBots Bubble Widget SDK 提供的 API 接口设置用户ID。

window.ChatBot.setUserId("your_user_id")
// 说明：支持 Agent 开发者设置自定义用户ID
更多详细的操作指南请参考 部件气泡-高级用法。

iframe 设置用户ID
开发者使用 iframe 方式集成 Agent 至开发者网站提供服务时，可在网站用户处于登录状态时，通过调用 GPTBots 提供的 iframe 方法设置用户ID。

方案一：网页嵌入 iframe 地址规则为：iframe_url+?user_id=your_user_id
说明：支持 Agent 开发者设置用户身份ID，若不设置则使用 GPTBots 默认生成的用户身份ID

方案二：通过 javascript 代码动态设置用户ID
Array.from(document.getElementsByTagName('iframe')).filter(iframe => iframe.src.includes('gptbots')).forEach(iframe => iframe.contentWindow.postMessage('{"type":"UserId","data":"your_user_id"}', '*'))
说明：以上是给 iframe 模式，动态设置 userId 的示例，将your_user_id 替换为实际的 userId 即可
更多详细的操作指南请参考 iframe-高级用法。

LiveChat 设置用户ID
当开发者使用 Livechat 的 Widget 面向网站用户提供客服服务，同时使用GPTBots AI Agent 提供客户服务时，可通过设置用户ID 的方式实现Agent用户与网站登录用户之间的身份打通。可在网站用户处于登录状态时，通过调用 LiveChat Widget SDK 提供的 API 接口设置用户ID。

LiveChatWidget.call("set_session_variables", {
    user_id: "your_user_id"  // 网站用户登录后的身份ID
});
更新用户属性
 最新更新：30 天前
支持通过 API 批量更新用户属性值，开发者可以根据业务需求，灵活设置用户属性，以便更好地进行用户画像和推荐。

请求方式
POST

调用地址
https://api-${endpoint}.gptbots.ai/v1/property/update

Request Authentication
详情参见 API 概述的鉴权方式说明。

请求
请求示例
curl -X POST "https://api-${endpoint}.gptbots.ai/v1/property/update" \
-H 'Authorization: Bearer ${API Key}' \
-H 'Content-Type: application/json' \
-d '{
  "user_id": "example_user_id",
  "property_values": [
    {
      "property_name": "example_property_name",
      "value": "example_value"
    }
  ]
}'
请求头
字段	类型	说明
Authorization	Bearer ${token}	使用 Authorization: Bearer ${token}进行调用验证，请在 API 密钥页面获取密钥作为 token。
Content-Type	application/json	数据类型，取值为 application/json。
请求参数
参数	类型	说明	required
user_id	string	需要设置用户属性的用户id	true
property_values	list	待更新的属性列表	true
property_values.property_name	string	属性名称	true
property_values.value	object	属性值	true
响应
参数	类型	说明
success_update	list	成功更新的用户属性列表
success_update.propertyName	string	成功更新的属性名称
success_update.value	object	成功更新的属性值
fail_update	list	更新失败的用户属性列表
fail_update.value	object	更新失败的属性值
fail_update.property_name	string	新失败的属性名称
上一篇
设置用户ID
查询用户属性
 最新更新：30 天前
支持开发者查询指定用户ID或匿名用户ID,批量查询用户属性值，每次查询最多支持100个用户ID或匿名用户ID。

请求方式
GET

调用地址
https://api-${endpoint}/v2/user-property/query

调用验证
详情参见 API 概述的鉴权方式说明。

请求
请求示例
curl -X GET 'https://api-${endpoint}/v2/user-property/query'  \
-H 'Authorization: Bearer ${token}' \
-d '{
      "user_ids": [
        "example_user_id_1",
        "example_user_id_2"
      ],
      "anonymous_ids": [
        "example_anonymous_id_1",
        "example_anonymous_id_2"
      ]
}'
请求头
字段	类型	说明
Authorization	Bearer ${token}	使用 Authorization: Bearer ${token}进行调用验证，请在 API 密钥页面获取密钥作为 token。
请求体
参数	类型	说明	required
user_ids	string	需要查询用户属性的用户id	必填，与anonymous_ids二选一
anonymouse_ids	string	需要查询用户属性的匿名用户id	必填，与user_ids二选一
user_id 与 anonymouse_id 必须二选一，若均传入，则以 user_id 为准。

响应
响应体
{
  {
    "user_id": "example_user_id_1",
    "property_values": [
      {
        "property_name": "example_property_name",
        "value": "example_value"
      },
      {
        "property_name": "example_property_name",
        "value": "example_value"
      }
    ]
  },
  {
    "anonymous_id": "example_anonymous_id_2",
    "property_values": [
      {
        "property_name": "example_property_name",
        "value": "example_value"
      },
      {
        "property_name": "example_property_name",
        "value": "example_value"
      }
    ]
  }
}
成功响应
参数	类型	说明
user_id	string	所查询的user_id
anonymous_id	string	所查询的anonymous_id
property_values	list	user_id的用户属性和属性值列表
失败响应
参数	类型	说明
code	int	错误码
message	string	错误信息
状态码
状态码	说明
200	成功
400	参数错误
401	未授权
403	权限不足
500	服务器错误
503	user_id不存在
504	匿名用户ID不存在

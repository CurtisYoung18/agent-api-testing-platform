---
order: 3
path: iframe-widget
updateTime: 2024-06-01
title: iframe的集成指南 - GPTBots
description: 如何将 AI Bot 以iframe的方式集成到公司网站和shopify
keywords: 集成,iframe，shopify，网站
---
# iframe
将 Bot 以 iframe 的方式嵌入到业务网站中，用户访问目标网页时即可加载 Bot 对话窗口，从而提供在线客服、售前咨询和客户线索搜集等服务。
## 如何集成到网站

1. 进入Bot-集成-[iframe](https://www.gptbots.ai/developer/space-bot/setting/66473dfe50a7b27eb11d0156/widget)，复制「集成代码」
![alt text](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-13.png)
2. 将代码复制到网站 HTML 页面的自定位置
3. 发布网站即可完成 AI Bot的嵌入和进行对话
4. 若你需要自定义UI和logo 、控制用户消息频率、展示主动消息以提升交互率，可继续进行高级设置。

## 自定义 UI
此功能支持自定义配置部件气泡的尺寸、位置、颜色、图标、 LOGO和名称等信息
![alt text](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-12.png)
- 部件昵称：允许自定义名称
- 部件简介：允许自定义简介信息
- 主题设置：允许自定义部件的主题色、气泡图标和 Bot的形象
- 气泡自定义：支持根据业务需求，自定义设定气泡展示的位置和气泡尺寸
- 对话框自定义：支持根据业务需求，自定义设定对话窗口的宽度和高度（为兼容小尺寸屏幕，不建议数值过大）
- 自定义LOGO：Growth 计划用户支持自定义 LOGO 或者不展示 LOGO 信息，Business 计划用户支持自定义域名地址

## 安全频控

- 域名白名单：定义「部件气泡集成代码」可嵌入的域名范围。若关闭，则视为不限制；
![域名白名单](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-5.png)

- 积分消耗限制：定义在「部件气泡」积分消耗限制。若关闭，则视为不限制；
![部件积分总额限制](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-6.png)
  - 最多设置 3 条
  - 支持按照「每日/每周/每月」设定部件气泡的总积分消耗上限

- 用户消耗限制：定义每个用户的积分消耗限制。若关闭，则视为不限制；
![用户积分消耗限制](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-7.png)
  - 最多设置 3 条
  - 支持按照「每日/每周/每月」设定每个用户积分消耗上限

- 用户速率限制：定义每个用户的消息发送频率限制。若关闭，则视为不限制；
![用户消息频率限制](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-8.png)
  - 最多设置 3 条
  - 支持按照「消息发送数量/时间段」设定每个用户消息发送梳理上限
  - 超限时不再调用 Bot 回复，直接自动回复预置的消息内容

## 事件回调
### 如何将部件气泡的用户行为事件传递到 GA4 或三方系统
1. 创建 GA4 回调事件，从 GA4 目标项目中获取 [Measurement Protocol API Secret](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=firebase) 和 [Measurement ID](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events?client_type=firebase)信息并填入。
<div style="position: relative; padding-bottom: calc(51.416666666666664% + 42px); height: 0;"><iframe src="https://app.supademo.com/embed/clwt78g2r14l6dmfh1rrczdyi" title=" GPTBots 气泡部件事件数据同步至GA4" allow="clipboard-write" frameborder="0" webkitallowfullscreen="true" mozallowfullscreen="true" allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>

2. 创建 Webhook 回调事件，按照页面提示选择所需的回调事件、填写 URL 和鉴权信息即可
![alt text](https://static.gptbots.cc/aigc/docs/20240603/075758823/image-10.png)
3. 在事件回调列表中「启用」该回调，在 GA4 或 Webhook 地址中检查数据是否正常，数据正常入库后即可用户数据分析

## 高级用法

### 设置用户信息接口
1. 设置用户ID
- 方案一：网页嵌入 iframe 地址规则为：`iframe_url`+`?user_id=your_user_id`
> 说明：支持 Bot 开发者设置用户身份ID   
- 方案二：通过 javascript 代码动态设置用户ID
```
Array.from(document.getElementsByTagName('iframe')).filter(iframe => iframe.src.includes('gptbots')).forEach(iframe => iframe.contentWindow.postMessage('{"type":"UserId","data":"your_user_id"}', '*'))
```
2. 设置用户邮箱
网页嵌入 iframe 地址规则为：`iframe_url`+`?email=somebody@mail.com`
// 说明：支持 Bot 开发者设置用户邮箱，在用户呼叫人工服务时可免去填写邮箱的步骤，若不设置则用户发起人工服务请求时必须填写邮箱地址方可呼叫人工服务
```
### 事件回调数据格式
通过 Webhook 或 GA4 所传递的部件气泡的事件及事件属性采用以下数据格式，请自行解析后存储落库。
```JavaScript
{
  "clien_id": "",  //优先取使用 GA4 的 gtag 方法去获取 client id，无法获取则由 GPTBots 自行生成
  "user_id": "",  //开发者设置的 UserId,未设置则为 null
  "event_name": "Show widget bubble",     //事件名称
  "event_params": {  
	  "key1": "abc",  //事件属性名称:属性值(string)
	  "key2": 123     //事件属性名称:属性值(number)
	}
}
```

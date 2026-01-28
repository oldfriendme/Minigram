## 快速开始
1. 访问[@BotFather](https://t.me/BotFather)获取token,格式为:123456789:ABCDEFGHIKabcnopqrstuvwxyzA，填入SECRET_BOT_TOKEN，可发送`/setjoingroups`来禁止此Bot被拉到垃圾群组

2. 访问[@getidsbot](https://t.me/getidsbot)获取你的用户id，填入self_uid 

3. 访问[uuidgenerator](https://www.uuidgenerator.net/)获取一个uuid，填入SECRET_uuid 

4. 自己想一个path，填入SECRET_path 

5. 使用openssl rand -base64 15生成verify_SECRET，填入verify_SECRET

4. 登录[cloudflare](https://workers.cloudflare.com/)，创建一个Turnstile，获取**SECRET_KEY** 与 **SITE_KEY**，填入Captcha_SECRET_KEY，verify_SECRET 

以下变量成功获取完了
```js
const Captcha_SECRET_KEY = "0x30000000000000000ADEA5247AFFFFFFF"
const Captcha_SITE_KEY = "3x00000000000000000000FF"

const verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"

const SECRET_path = "/my_webhook_path_123" //这个自己取
const SECRET_uuid = "056a8dca-9279-4ba9-85e8-0830fd846eb0" 

const SECRET_BOT_TOKEN = "123456789:ABCDEFGHIKabcnopqrstuvwxyzA"

const self_uid = "6123456789"

const verify_URL = "https://verify.example.com/myapp"
```

<br>

#### 5. 创建一个worker，部署captcha.js

添加以下worker的变量

```js
Captcha_SECRET_KEY = "0x30000000000000000ADEA5247AFFFFFFF"
Captcha_SITE_KEY = "3x00000000000000000000FF"
verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"
```

此worker绑定的URL为https://verify.example.com/myapp

---


<br>

#### 6. 创建一个worker，部署register_bot.js，绑定域名为tgbot.example.com

添加以下worker的变量

```js
verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"
SECRET_path = "/my_webhook_path_123"
SECRET_uuid = "056a8dca-9279-4ba9-85e8-0830fd846eb0" 
SECRET_BOT_TOKEN = "123456789:ABCDEFGhijklmnopqrstuvwxyzA"
self_uid = "6123456789"
verify_URL = "https://verify.example.com/myapp"
```

#### 7.部署后访问 注册webhook
```
https://tgbot.example.com/myselfurl_registerWebhook
```

#### 8.编辑register_bot.js代码，替换为tg_worker.js代码


#### 9.绑定kv数据库，创建一个Namespace Name为`MY_KV`的kv数据库，在setting -> variable中设置`KV Namespace Bindings`：MY_KV -> MY_KV

#### 10.把MY_KV绑定到tg_worker中

## 部署完成

<br>

---

## 使用方法
- 管理员使用/start启动机器人
- 管理员回复`/ban`, `/unban`拉黑或解除拉黑
- 管理员回复消息转发给用户。

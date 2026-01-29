# minigram_bot

> **Telegram 私信机器人（tg PM Bot）** ，**Livegram 的开源替代品** · **免费** · **无广告** · **可自部署** · **垃圾信息拦截**

Minigram 是一个最小化的tg私信机器人实现，私信模块代码**去除空格与注释**不到300行。人机验证模块**去除空格与注释**不到100行

---

<br>

## 注意：

如需获取简单版本配置教程，可访问 [Simple.md](simple.md) 文件

如需图文教程版本配置教程，可访问 [Full.md](full.md) 文件

<br>

---

## ✨ 特性

-  **完全免费 / 无广告**
-  **开源可审查，支持自部署，数据完全掌控**
-  **bot私信，绕过双向限制**
-  **消息群组模式，防止占用过多会话id**
-  **消息防撤回，回显用户UID，识别用户改头换面**
-  **支持VPS本地部署与CF Worker部署**
-  **人机验证支持，拦截垃圾广告**

---

## 特点介绍

- 支持消息防撤回，防止对方清空私信跑路
- ️支持人机验证，防止收到批量垃圾信息
- 代码简单，可方便自行修改
- 验证器可与机器人设计分离，可隐藏机器人webhook，降低负载。
- 支持单向拉黑用户（用户给你发消息直接拒收，但是你可以给用户发）

---

## 快速开始

首先你要准备几个变量，下面以使用CF Worker部署，并Turnstile为人机验证方式示例

> 注意，理论上支持所有验证方法，包括Turnstile，reCaptcha，hCaptcha只需要修改**captcha.js**文件即可（此文件代码不到100行，可AI轻松修改）

<br>

### 1.开始之前，把下面准备好

```js
const Captcha_SECRET_KEY //Turnstile 获取 SECRET_KEY(相当于私钥)
const Captcha_SITE_KEY //Turnstile的SITE_KEY (相当于公钥)

const verify_SECRET //机器人的verify_SECRET (openssl rand -base64 15 获取,相当于密钥)

const SECRET_path //tg 的webhook路径

const SECRET_uuid //机器人访问认证uuid 

const SECRET_BOT_TOKEN //机器人bot token

const self_uid //自己的tg uid

const verify_URL //人机验证回调地址
```

<br>

### 2.开始
添加一个Turnstile，添加一个绑定域名，比如verify.example.com

完成配置

得到Captcha_SECRET_KEY、Captcha_SITE_KEY

<br>

#### 2.生成其他变量

verify_SECRET


SECRET_path

SECRET_uuid

<br>

### 4.去[@BotFather](https://t.me/BotFather) 发送 /newbot 设置机器人获取一个token

填入SECRET_BOT_TOKEN

<br>

### 5.获取自己的self_uid

去[@getidsbot](https://t.me/getidsbot)

<br>

### 6.构造verify_URL

第一步部署Turnstile的时候，应该设置了一个站点verify.example.com。

```js
const verify_URL = "https://verify.example.com/myapp"
```

**注意**：不要漏掉前缀https，后辍/myapp可以自行取，这里以/myapp为例

<br>

---

<br>


## 正式部署


### 1.部署验证模块

填入这些变量

```js
Captcha_SECRET_KEY
Captcha_SITE_KEY
verify_SECRET
```

部署worker 使用**captcha.js**的代码

此worker域名为verify.example.com

<br>

打开 `https://verify.example.com/myapp` 


如果返回`Token is null`即成功



<br>

---

<br>

### 2.部署机器人模块

添加worker，设置这些变量

```js
verify_SECRET
SECRET_path
SECRET_uuid

SECRET_BOT_TOKEN

self_uid

verify_URL
```

<br>

#### 2.1 部署webhook注册器(可选)

如果你不想手动 **curl** 来注册tg webhook的话，可以部署**register_bot.js**实现注册。注册之后再替换为tg worker代码

域名以tgbot.example.com示例

访问 `https://tgbot.example.com/myselfurl_registerWebhook`

如果返回ok即注册成功，webhoook被注册为`https://tgbot.example.com/${SECRET_path}`

<br>


#### 2.2 部署tg worker代码。

使用**tg_worker.js**的代码部署此worker。

#### 2.3 绑定KV命名空间

创建一个KV，名称填MY_KV，把这个KV绑定到worker上去。

<br>

---

<br>

## 开始使用

打开你创建的机器人

- 发送/start 可以看到使用提示。
- 用户发消息：选中回复此消息，即可转发到用户。
- 回复/ban，拉黑
- 回复/unban，解除拉黑。
- /ban与/unban指令不会转发到用户。
- 用户即使删除消息，也会保留。防止用户清空消息跑路。

<br>

---

## 🔐 安全建议

- 1.CF设置一个waf，拦截所有,host="tgbot.example.com"，但是path   !=  "/my_webhook_path_123" 防止被爬虫刷worker额度。
- 2.更改webhook register_bot的注册与注销路径，可防止他人扫到
- 3.密钥与key自己生成，不要与直接抄上面教程的

---

<br>

## 📄 注意事项

- 由于机器人会检查时差防止重放，如果你使用本地服务器部署，记得使用ntp同步一下时间

- 验证器与机器人可以部署到两台VPS上，也可以部署到两个不同cf账号上。
也可以一个部署在CF一个部署在VPS上。

- CF 的 worker路由要求先解析对应域名到IP地址（并且开启小黄云），才能进行worker路由。如果没有自己的VPS IP地址，想找一个IP，找各个域名注册商的停靠页面就行。


人机验证默认每一个用户只会验证一次。如需设置验证有效期，修改以下代码

修改： 
```js
await MY_KV.put(uid_str,"1")
```
为

```js
await MY_KV.put(uid_str,"1", { expirationTtl: 3600*24*15 }) //即可设置有效期。例子是设置为3600*24*15秒，即15天
```

<br>


---


<br>

### 后记

tg 私信bot容易收到垃圾信息，我稍微研究了一下。很多实现都是在tg中回答问题，或者点击按钮来验证。

#### 1. TG 内问答验证：

由于输入输出都很少，使用4o‑mini / gemini‑flash 这种便宜模型，每次验证：输入/输出大概几十 token
         
成本≈ $0.00001 – $0.00005 / 次
      
<br>
	  
#### 2. Button / Inline Keyboard 验证

这种长这样：“**请点击正确的按钮**” 验证或者选择正确按钮对象/图片
     
但是问题是： 

    TG API 完全公开
    Button 文本 / callback_data 可以直接解析，还不需要 OCR 定位
	如果使用emoji来实现选颜色/对象，根本需要RGB/CV识别，使用utf8匹配就能找出来
      
<br>

写这个项目的时候，考虑了前面的问题，采用自建外部验证器进行验证，大概测试一个月+左右，确实没有收到垃圾信息了。


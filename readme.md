# Minigram 

> **Telegram 私信机器人（tg PM Bot）** ，**Livegram 的开源替代品** · **免费** · **无广告** · **可自部署**** · **垃圾信息拦截**

Minigram 是一个最小化的tg私信机器人实现，私信模块代码**去除空格与注释**不到300行。人机验证模块**去除空格与注释**不到100行

---

<br>

### 0x00 现有问题

tg 私信bot容易收到垃圾信息，我稍微研究了一下。很多实现都是在tg中回答问题，或者点击按钮来验证。

#### 1.TG 内问答 验证：

由于输入输出都很少，使用4o‑mini / gemini‑flash 这种便宜模型，每次验证：输入/输出大概几十 token
         
成本≈ $0.00001 – $0.00005 / 次
      
<br>
	  
#### 2.Button / Inline Keyboard 验证

这种长这样：“请点击正确的按钮” 验证或者选择正确对象/图片
     
但是问题是： 

    TG API 完全公开
    Button 文本 / callback_data 可以直接解析，还不需要 OCR 定位
	如果使用emoji来实现选颜色/对象，根本需要RGB/CV识别，使用utf8匹配就能找出来
      
<br>

因此在写这个项目的时候，考虑了现有验证的不足，采用自建外部验证器进行验证，大概测试一个月左右，确实没有收到垃圾信息了。

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

## 🧩 特点介绍

- 支持消息防撤回，防止对方清空私信跑路
- ️支持人机验证，防止收到批量垃圾信息
- 代码简单，可方便自行修改
- 验证器可与机器人设计分离，可隐藏机器人webhook，降低负载。
- 支持单向拉黑用户（用户给你发消息直接拒收，但是你可以给用户发）

---

## 🚀 快速开始

首先你要准备几个变量，下面以使用CF Worker部署，并Turnstile为人机验证方式示例

> 注意，理论上支持所有验证方法，包括Turnstile，reCaptcha，hCaptcha只需要修改captcha.js文件即可（此文件代码不到100行，即使AI修改也轻而易举）

<br>

开始之前，把下面变量准备好

```js
const Captcha_SECRET_KEY //Turnstile的SECRET_KEY(相当于私钥)
const verify_SECRET //机器人的verify_SECRET (相当于密钥)
const Captcha_SITE_KEY //Turnstile的SITE_KEY (相当于公钥)
const SECRET_path //tg 的webhook路径
const SECRET_uuid //机器人访问认证uuid 
const SECRET_BOT_TOKEN //机器人bot token
const self_uid //自己的tg uid。(这个uid填谁，谁就是管理员)
const verify_URL //人机验证回调地址
```

#### 注意：
如果变量名称带SECRET，说明该项变量需要严格保密，泄露可能导致他人操作你的机器人。

<br>

## 0x01 生成变量

先假设你已经在cloudflare上托管了一个域名

![](img/v0.jpg?raw=true)

#### 1.生成Turnstile变量，添加一个绑定域名，比如我的verify.example.com


![](img/v1.jpg?raw=true)

长的为**Captcha_SECRET_KEY**
短的为**Captcha_SITE_KEY**

```js
const Captcha_SECRET_KEY = "3x00000000000000000000FF"
const Captcha_SITE_KEY = "0x30000000000000000ADEA5247AFFFFFFF"
```

<br>

#### 2.生成verify_SECRET

运行
```bash
openssl rand -base64 15
```
就能生成一个

比如我生成为`u0zcgbzN4vYJpEmzs0yR`

```js
const verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"
```

<br>

#### 3.生成SECRET_path，SECRET_uuid
**SECRET_path** 这个随便想一个路径，不容易被别人猜到就行
**SECRET_uuid** 找一个uuid生成器，比如 uuidgenerator.net


```js
const SECRET_path = "/my_webhook_path_123" //这个自己取
const SECRET_uuid = "056a8dca-9279-4ba9-85e8-0830fd846eb0" //这个自己生成
```

<br>

### 4.生成SECRET_BOT_TOKEN

去[@BotFather](https://t.me/BotFather) 发送 /newbot 命令，设置完了的bot用户名，会返回一个token。大概是这种格式

![](img/v2.jpg?raw=true)

123456789:ABCDEFGHIKabcnopqrstuvwxyzA

```js
const SECRET_BOT_TOKEN = "123456789:ABCDEFGHIKabcnopqrstuvwxyzA"
```

**注意**：可以发送/setjoingroups来禁止此Bot被拉到垃圾群组

<br>

#### 5.获取self_uid

访问
[@getidsbot](https://t.me/getidsbot)

会返回自己tg的uid，填上

```
const self_uid = "6123456789"
```

<br>

#### 6.构造verify_URL

你第一步部署Turnstile的时候，不是设置了一个站点verify.example.com嘛。

这个就直接填哪个站点就行了。

```js
const verify_URL = "https://verify.example.com/myapp"
```

**注意**：不要漏掉前缀https，后辍/myapp可以自行取，这里以/myapp为例

<br>

---

<br>


## 0x02 正式部署

开始之前，已经有以下变量了

```js
const Captcha_SECRET_KEY = "3x00000000000000000000FF"
const Captcha_SITE_KEY = "0x30000000000000000ADEA5247AFFFFFFF"

const verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"

const SECRET_path = "/my_webhook_path_123" //这个自己取
const SECRET_uuid = "056a8dca-9279-4ba9-85e8-0830fd846eb0" 

const SECRET_BOT_TOKEN = "123456789:ABCDEFGHIKabcnopqrstuvwxyzA"

const self_uid = "6123456789"

const verify_URL = "https://verify.example.com/myapp"
```

<br>

### 1.部署验证模块

![](img/v3.jpg?raw=true)

打开worker页面，创建一个worker，选择hello world

![](img/v4.jpg?raw=true)

先直接继续

![](img/v6.jpg?raw=true)

先转到设置，把这三个变量填上去

查看上面的
```js
const Captcha_SECRET_KEY = "3x00000000000000000000FF"
const Captcha_SITE_KEY = "0x30000000000000000ADEA5247AFFFFFFF"
const verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"
```

![](img/v5.jpg?raw=true)

密钥与纯文本都是变量类型。区别只是前端会不会显示而已

然后转到部署，修改代码，把**captcha.js**文件的代码全部粘贴上去即可。

![](img/v7.jpg?raw=true)

绑定worker路由

路由为

verify.example.com/myapp*

![](img/v8.jpg?raw=true)

<br>

#### 1.1 验证是否成功

打开 `https://verify.example.com/myapp` 


如果返回`Token is null`即成功



<br>

---

<br>

### 2.部署机器人模块

一样是，打开worker页面，创建一个worker，选择hello world，先直接继续

![](img/v4.jpg?raw=true)

先转到设置，把剩余变量填上去

需要以下变量
```js
const verify_SECRET = "u0zcgbzN4vYJpEmzs0yR"

const SECRET_path = "/my_webhook_path_123"
const SECRET_uuid = "056a8dca-9279-4ba9-85e8-0830fd846eb0" 

const SECRET_BOT_TOKEN = "123456789:ABCDEFGhijklmnopqrstuvwxyzA"

const self_uid = "6123456789"

const verify_URL = "https://verify.example.com/myapp"
```

![](img/v9.jpg?raw=true)

<br>

#### 2.1 部署注册器

把**register_bot.js**的全部代码粘贴进去，点击部署。

绑定worker路由

![](img/v10.jpg?raw=true)

比如我选择域名tgbot.example.com当机器人域名

路由为

tgbot.example.com/*

#### 2.2 注册tg bot的webhook 

访问 `https://tgbot.example.com/myselfurl_registerWebhook`

如果返回ok即注册成功

<br>

#### 2.3 部署tg worker代码。

在原先基础上，再次编辑worker代码（直接修改register_bot.js代码，不需要新建）

![](img/v7.jpg?raw=true)


把**tg_worker.js**的内容复制进去，替换掉之前worker代码。

#### 2.4 绑定KV命名空间

创建一个KV，名称填MY_KV

![](img/v11.jpg?raw=true)

转到worker，添加绑定，把这个KV绑定到worker上去。

![](img/v12.jpg?raw=true)

<br>

---

<br>

## 0x03 开始使用

打开你创建的机器人，你在BotFather里面设置的机器人名字，以bot结尾的那个。

发送/start 可以看到使用提示。

如果用户发消息：选中回复此消息，即可转发到用户。

如果消息选中reply回复/ban，用户即被拉黑，此时可以像用户推送消息，而用户却不能给你发消息。

如果选中reply回复/unban，解除拉黑。

/ban与/unban指令不会转发到用户。

用户即使删除消息，我方也会保留。防止用户清空消息跑路。

<br>

---

## 🔐 安全建议

- 1.CF设置一个waf，拦截所有,host="tgbot.example.com"，但是path   !=  "/my_webhook_path_123" 防止被爬虫刷worker额度。
- 2.更改webhook register_bot的注册与注销路径，可防止他人扫到
- 密钥与key自己生成，不要与直接抄上面教程的

---

<br>

## 📄 注意事项

- 由于机器人会检查时差防止重放，如果你使用本地服务器部署，记得使用ntp同步一下时间

- 验证器与机器人可以部署到两台VPS上，也可以部署到两个不同cf账号上。
也可以一个部署在CF一个部署在VPS上。

- CF 的 worker路由要求先解析对应域名到IP地址（并且开启小黄云），才能进行worker路由。如果没有自己的VPS IP地址，想找一个IP，找各个域名注册商的停靠页面就行。


人机验证默认每一个用户只会验证一次。如需设置验证有效期，修改以下代码

修改： await MY_KV.put(uid_str,"1")
为：await MY_KV.put(uid_str,"1", { expirationTtl: 3600*24*15 }) 即可设置有效期。例子是设置为3600*24*15秒，即15天

<br>


---

**Minigram —— 简单、纯粹 Telegram 私信机器人**
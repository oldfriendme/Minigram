var SECRET_path = ""
var SECRET_uuid = ""
var self_uid = ""
var verify_URL = ""
var verify_SECRET = ""
var SECRET_BOT_TOKEN = ""
var MY_KV

export default {
  async fetch(request, env, ctx) {
	SECRET_path = env.SECRET_path
	SECRET_uuid = env.SECRET_uuid
	self_uid = env.self_uid
	verify_URL = env.verify_URL
	verify_SECRET = env.verify_SECRET
	SECRET_BOT_TOKEN = env.SECRET_BOT_TOKEN
	MY_KV = env.MY_KV
    const url = new URL(request.url);
	const path = url.pathname;
	if (url.pathname === SECRET_path) {
		if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET_uuid) {
			return new Response('Unauthorized', { status: 403 })
		}
		const update = await request.json()
		ctx.waitUntil(
			onUpdate(update)
		);
		return new Response('ok')
	} else {
		return new Response("Hello World!");
	}
  },
};

async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }
}

async function onMessage (message) {
	if(message.chat.id.toString() === self_uid){
	let helloMsg = "使用方法，选中并 reply，或选中发送/ban，/unban"
if(message.text === '/start'){
    return sendMessage({
      chat_id:message.chat.id,
      text:helloMsg,
    })
}
if(!message?.reply_to_message?.chat){
      return sendMessage({
        chat_id:self_uid,
        text:helloMsg,
      })
}

let yourid = 0;
const fwd = message.reply_to_message?.forward_from
if (!fwd?.id) {
	yourid = await sess2uid(message.reply_to_message.message_id)
} else {
	yourid = fwd.id
}
if (!yourid) {
  return sendMessage({
    chat_id: self_uid,
    text: '⚠️ 无法识别回复对象，请回复用户转发的原始消息'
  })
}
if (message.text === '/ban') {
	await lockUser(yourid)
	return sendMessage({
		chat_id: self_uid,
		text: `UID:${yourid}ban了`,
	})
}
if (message.text === '/unban') {
	await freeUser(yourid)
	return sendMessage({
    chat_id: self_uid,
    text:`UID:${yourid}出狱了`,
  })
}
	return sendMessage({
      chat_id: yourid,
	  text:message.text,
    })
	} else {
	let check_verify = await get_verify(message.chat.id)
if(message.text === '/start'){
	if (check_verify===false){
		let makeverify = message.chat.id + ''
		let Unixtime = Math.floor(Date.now() / 1000 / 300);
		let timestamp = Unixtime + ''
		makeverify = randomHex(12) + makeverify + '_' + timestamp
		let verifyMsg = "人机验证：打开浏览器：" + verify_URL + "?token=" + makeverify + " ，获取返回值并回复"
			return sendMessage({
				chat_id:message.chat.id,
				text:verifyMsg,
			})
	} else {
		let goMsg = "你已通过验证，开始聊天吧"
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
	}

}
if (check_verify===false){
	if(message.text.startsWith("/checkin ")) {
		//例子 /checkin [原始数据去掉uid]_[验证值]
		//[原始数据去掉uid]，原始数据为12hex+uid 客户端返回的数据需要去掉uid，在服务端手动构建，防止伪造。
		//结果类似 /checkin ea3eadf553ea_1728387735_a6JHDB4fAK
		let result = message.text.substring("/checkin ".length);
		let goMsg = "验证失败，请联系管理员"
		if ((result.length < 12)||(result.length >256)) {
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		}
		let parts = result.split("_");
		if (parts.length !== 3) {
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		}
		//服务端再次重新构造一遍
		let Unixtime = Math.floor(Date.now() / 1000 / 300);
		let timestamp = Unixtime + ''
		if (parts[1] !== timestamp) {
			//检查时差
			goMsg = "验证超时，请/start重试"
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		}
		if (parts[0].length !=12) {
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		}
		let orig_sum = message.chat.id + ''
		orig_sum = parts[0] + orig_sum + '_' + timestamp
		let mySum = await HMac_sum(orig_sum,verify_SECRET) 
		if (mySum === parts[2]){
			goMsg = "验证成功，你可以发消息了"
			await set_verify(message.chat.id)
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		} else {
			return sendMessage({
				chat_id:message.chat.id,
				text:goMsg,
			})
		}
	}}
	if (check_verify===false){
		let failMsg = "未通过人机验证，消息已被丢弃。请先发送/start"
		return sendMessage({
			chat_id:message.chat.id,
			text:failMsg,
		})
	} else {
		return forwardMsg(message)
	}
	}
}

function randomHex(length) {
  const bytes = new Uint8Array(length / 2);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function forwardMsg(message){
	let nowid = message.chat.id;
	let isban = await get_ban(nowid)
if(isban){
    return sendMessage({
      chat_id: nowid,
      text:'消息已发出，对方拒收了'
    })
}

//转发消息前，发送uid对于的Name，方便区分
let notice_txt = nowid + ''
notice_txt = 'uid:' + nowid + ' ' + message.chat.first_name + ' id:' + message.chat.username
	await sendMessage({
		chat_id:self_uid,
		text:notice_txt,
	})

let res = await forwardMessage({
    chat_id:self_uid,
    from_chat_id:nowid,
    message_id:message.message_id
  })
	if(res.ok){
if (!res.result.forward_from){
await uid2sess(nowid,res.result.message_id);
}
  }else{
await sendMessage({
    chat_id: nowid,
    text: '❌ 消息丢失，Unknown ERR'
})
  }
}

async function lockUser(now_uid){
  if(now_uid !== self_uid){
	return await banfunc(now_uid)
  }
}

async function freeUser(now_uid){
  return await freefunc(now_uid)
}

function sendMessage(msg = {}){
	const willsendjson = {
		method: 'POST',
		headers: {
		'content-type': 'application/json'
	},
	body:JSON.stringify(msg)
	};
	return fetch(getUrl('sendMessage', null), willsendjson).then(r => r.json())
}

function forwardMessage(msg = {}){
	const willsendjson = {
		method: 'POST',
		headers: {
		'content-type': 'application/json'
	},
	body:JSON.stringify(msg)
	};
	return fetch(getUrl('forwardMessage', null), willsendjson).then(r => r.json())
}

function getUrl (method, params) {
  let query = ''
  if (params!==null) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${SECRET_BOT_TOKEN}/${method}${query}`
}

async function uid2sess(uid,session){
	let sess_str=session+''
	sess_str = 'sess_' + sess_str 
	let uid_str=uid+''
	return await MY_KV.put(sess_str, uid_str)
}

async function sess2uid(session){
	let sess_str=session+''
	sess_str = 'sess_' + sess_str 
	return await MY_KV.get(sess_str)
}

async function get_ban(uid){
	let uid_str=uid+''
	uid_str = 'ban_' + uid_str
	let res = await MY_KV.get(uid_str)
	if (res == 1){
		return true
	} else {
		return false
	}
}

async function banfunc(uid){
	let uid_str=uid+''
	uid_str = 'ban_' + uid_str
	await MY_KV.put(uid_str,"1")
}

async function freefunc(uid){
	let uid_str=uid+''
	uid_str = 'ban_' + uid_str
	await MY_KV.delete(uid_str)
}

async function get_verify(uid){
	let uid_str=uid+''
	uid_str = 'verify_' + uid_str
	let res = await MY_KV.get(uid_str)
	if (res == 1){
		return true
	} else {
		return false
	}
}

async function set_verify(uid){
	let uid_str=uid+''
	uid_str = 'verify_' + uid_str
	await MY_KV.put(uid_str,"1")
	//await MY_KV.put(uid_str,"1", { expirationTtl: 3600*24*15 }) //15天有效
}

async function HMac_sum(message,key) {
  const enc = new TextEncoder();
  const keyData = enc.encode(key);
  const msgData = enc.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,            
    ["sign"]         
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const bytes = new Uint8Array(signature);
  return btoa(String.fromCharCode(...bytes));
}
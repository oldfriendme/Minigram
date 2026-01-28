var SECRET_path = ""
var SECRET_uuid = ""
var SECRET_BOT_TOKEN = ""
const registerUrl="/myselfurl_registerWebhook"
const unregisterUrl="/myselfurl_unRegisterWebhook"

export default {
  async fetch(request, env, ctx) {
	SECRET_path = env.SECRET_path
	SECRET_uuid = env.SECRET_uuid
	SECRET_BOT_TOKEN = env.SECRET_BOT_TOKEN
    const url = new URL(request.url);
	const path = url.pathname;
	if (url.pathname === registerUrl) {
		return await registerWebhook(url)
	} else if (url.pathname === unregisterUrl) {
		return await unRegisterWebhook
	} else {
		return new Response("Hello World!");
	}
  },
};

async function registerWebhook (requestUrl) {
  const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${SECRET_path}`
  const r = await (await fetch(getUrl('setWebhook', { url: webhookUrl, secret_token: SECRET_uuid }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

async function unRegisterWebhook () {
  const r = await (await fetch(getUrl('setWebhook', { url: '', secret_token: SECRET_uuid }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

function getUrl (method, params) {
  let query = ''
  if (params!==null) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${SECRET_BOT_TOKEN}/${method}${query}`
}
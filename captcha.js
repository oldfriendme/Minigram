var Captcha_SECRET_KEY = "";
var verify_SECRET = "";
var Captcha_SITE_KEY = "";


const htmlhead = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Captcha verify</title><style>body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto;color:var(--text);background:linear-gradient(135deg,var(--bg-start) 0%,var(--bg-end) 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;}form{width:100%;max-width:420px;background:var(--card);border:1px solid #e8eaf0;border-radius:14px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,.15);backdrop-filter:saturate(1.1) blur(2px);}form h2{margin:0 0 14px;font-size:1.75rem;font-weight:700;text-align:center;letter-spacing:.2px;}.field{margin-bottom:14px;}#token{width:100%;padding:12px 14px;font-size:1rem;border-radius:10px;border:1px solid #e5e7eb;background:#f8f9fb;color:#374151;outline:none;}#token:focus{border-color:#93c5fd;box-shadow:0 0 0 4px var(--ring);}button[type="submit"]{width:100%;padding:12px;font-size:1rem;border-radius:10px;border:none;color:#fff;cursor:pointer;background:#6366f1;transition:transform .2s ease,box-shadow .2s ease;box-shadow:0 6px 14px rgba(99,102,241,.4);}button[type="submit"]:hover{transform:translateY(-1px);box-shadow:0 8px 16px rgba(99,102,241,.5);}button[type="submit"]:focus{outline:none;box-shadow:0 0 0 4px rgba(99,102,241,.35);}.copy-btn{width:100%;padding:12px;font-size:1rem;border-radius:10px;border:none;cursor:pointer;background:#22c55e;color:#fff;transition:.2s}.copy-btn:hover{background:#16a34a}</style></head><body>`

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

async function handlePost(request) {
    const body = await request.formData();
    const captcha = body.get('cf-turnstile-response');
	const token = body.get('token');
    const ip = request.headers.get('CF-Connecting-IP');

    let formData = new FormData();
    formData.append('secret', Captcha_SECRET_KEY);
    formData.append('response', captcha);
    formData.append('remoteip', ip);

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        body: formData,
        method: 'POST',
    });

    const res = await result.json();
    if (!res.success) {
        return new Response("Captcha fail");
    }
	if (!token){
		 return new Response("Token is null");
	}
	if ((token.length < 16)||(token.length >256)) {
		return new Response("Token is err");
	}
	let Unixtime = Math.floor(Date.now() / 1000 / 300);
	let timestamp = Unixtime + ''
	let parts = token.split("_");
	if (parts.length !== 2) {
		return new Response("Token is err");
	}
	if (parts[1] !== timestamp) {
		return new Response("session Expire");
	}
	
	if (parts[0].length<14){
		return new Response("Token is err");
	}
	
	let mySum = await HMac_sum(token,verify_SECRET);
	
	let resp = parts[0].slice(0, 12) +'_'+ timestamp +'_'+ mySum
	let htmlbody = htmlhead + `<form><h2>Your code</h2><div class="field"><input type="text" id="token" name="token" readonly value="/checkin ${resp}" aria-label="Token"></div><button type="button" class="copy-btn" onclick="copyTk()">copy</button></form><script>function copyTk() {const tokenInput = document.getElementById('token');navigator.clipboard.writeText(tokenInput.value).then(() => {const btn = document.querySelector('.copy-btn');btn.textContent = 'copied ✅';setTimeout(() => {btn.textContent = 'copy';}, 1500);});}</script></body></html>`
    return new Response(htmlbody, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
}

export default {
    async fetch(request, env, ctx) {
		Captcha_SECRET_KEY = env.Captcha_SECRET_KEY;
        verify_SECRET = env.verify_SECRET;
        Captcha_SITE_KEY = env.Captcha_SITE_KEY;
		
        if (request.method === 'POST') {
            return await handlePost(request);
        }

        const url = new URL(request.url);
		let token = url.searchParams.get('token');
		if (!token){
		 return new Response("Token is null");
		}
		if ((token.length < 12)||(token.length >256)) {
		return new Response("Token is err");
		}
		let eToken = encodeURIComponent(token);
        let body = htmlhead + `<form method="POST" action="" aria-label="Token Login"><h2>Captcha verify</h2><div class="field"><input type="text" id="token" name="token" readonly value="${eToken}" aria-label="Token"></div><div class="field"><div class="cf-turnstile" data-sitekey="${Captcha_SITE_KEY}" data-theme="light"></div></div><button type="submit">checking</button></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script></body></html>`;
        
        return new Response(body, {
            headers: {
                'Content-Type': 'text/html',
            },
        });
    },
};
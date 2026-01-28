package main

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha1"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "html"
    "io"
    "log"
    "mime/multipart"
    "net/http"
    "net/url"
    "os"
    "strconv"
    "strings"
    "time"
)

var (
    CaptchaSecretKey = os.Getenv("Captcha_SECRET_KEY")
    VerifySecret     = os.Getenv("verify_SECRET")
    CaptchaSiteKey   = os.Getenv("Captcha_SITE_KEY")
)

const htmlHead = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Captcha verify</title><style>body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto;color:var(--text);background:linear-gradient(135deg,var(--bg-start) 0%,var(--bg-end) 100%);display:flex;align-items:center;justify-content:center;min-height:100vh;}form{width:100%;max-width:420px;background:var(--card);border:1px solid #e8eaf0;border-radius:14px;padding:28px;box-shadow:0 20px 40px rgba(0,0,0,.15);backdrop-filter:saturate(1.1) blur(2px);}form h2{margin:0 0 14px;font-size:1.75rem;font-weight:700;text-align:center;letter-spacing:.2px;}.field{margin-bottom:14px;}#token{width:100%;padding:12px 14px;font-size:1rem;border-radius:10px;border:1px solid #e5e7eb;background:#f8f9fb;color:#374151;outline:none;}#token:focus{border-color:#93c5fd;box-shadow:0 0 0 4px var(--ring);}button[type="submit"]{width:100%;padding:12px;font-size:1rem;border-radius:10px;border:none;color:#fff;cursor:pointer;background:#6366f1;transition:transform .2s ease,box-shadow .2s ease;box-shadow:0 6px 14px rgba(99,102,241,.4);}button[type="submit"]:hover{transform:translateY(-1px);box-shadow:0 8px 16px rgba(99,102,241,.5);}button[type="submit"]:focus{outline:none;box-shadow:0 0 0 4px rgba(99,102,241,.35);}.copy-btn{width:100%;padding:12px;font-size:1rem;border-radius:10px;border:none;cursor:pointer;background:#22c55e;color:#fff;transition:.2s}.copy-btn:hover{background:#16a34a}</style></head><body>`

func hmacSum(message, key string) string {
    h := hmac.New(sha1.New, []byte(key))
    h.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func verifyCaptcha(token, ip string) (bool, error) {
    var buf bytes.Buffer
    writer := multipart.NewWriter(&buf)

    _ = writer.WriteField("secret", CaptchaSecretKey)
    _ = writer.WriteField("response", token)
    _ = writer.WriteField("remoteip", ip)
    writer.Close()

    req, err := http.NewRequest("POST",
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        &buf)
    if err != nil {
        return false, err
    }
    req.Header.Set("Content-Type", writer.FormDataContentType())

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return false, err
    }
    defer resp.Body.Close()

    body, _ := io.ReadAll(resp.Body)
    var result struct {
        Success bool `json:"success"`
    }
    err = json.Unmarshal(body, &result)
    return result.Success, err
}
func handlePost(w http.ResponseWriter, r *http.Request) {
    if err := r.ParseForm(); err != nil {
        http.Error(w, "Bad Request", 400)
        return
    }

    captcha := r.FormValue("cf-turnstile-response")
    token := r.FormValue("token")
    ip := r.Header.Get("CF-Connecting-IP")

    ok, err := verifyCaptcha(captcha, ip)
    if err != nil || !ok {
       http.Error(w, "Captcha fail", 403)
       return
    }

    if token == "" {
        http.Error(w, "Token is null", 400)
        return
    }
    if len(token) < 16 || len(token) > 256 {
        http.Error(w, "Token is err", 400)
        return
    }

    parts := strings.Split(token, "_")
    if len(parts) != 2 {
        http.Error(w, "Token is err", 400)
        return
    }

    unixTime := time.Now().Unix() / 300
    timestamp := strconv.FormatInt(unixTime, 10)

    if parts[1] != timestamp {
        http.Error(w, "session Expire", 403)
        return
    }
	
	if len(parts[0]) < 14 {
        http.Error(w, "Token is err", 400)
        return
    }

    sum := hmacSum(token, VerifySecret)
    resp := parts[0][:12] + "_" + timestamp + "_" + sum

    htmlBody := htmlHead + fmt.Sprintf(`<form><h2>Your code</h2><div class="field"><input type="text" id="token" name="token" readonly value="/checkin %s" aria-label="Token"></div><button type="button" class="copy-btn" onclick="copyTk()">copy</button></form><script>function copyTk() {const tokenInput = document.getElementById('token');navigator.clipboard.writeText(tokenInput.value).then(() => {const btn = document.querySelector('.copy-btn');btn.textContent = 'copied ✅';setTimeout(() => {btn.textContent = 'copy';}, 1500);});}</script></body></html>`, html.EscapeString(resp))

    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(htmlBody))
}
func handleGet(w http.ResponseWriter, r *http.Request) {
    token := r.URL.Query().Get("token")

    if token == "" {
        http.Error(w, "Token is null", 400)
        return
    }
    if len(token) < 12 || len(token) > 256 {
        http.Error(w, "Token is err", 400)
        return
    }

    eToken := url.QueryEscape(token)

    body := htmlHead + fmt.Sprintf(`<form method="POST" action="" aria-label="Token Login"><h2>Captcha verify</h2><div class="field"><input type="text" id="token" name="token" readonly value="%s" aria-label="Token"></div><div class="field"><div class="cf-turnstile" data-sitekey="%s" data-theme="light"></div></div><button type="submit">checking</button></form><script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer></script></body></html>`, eToken, CaptchaSiteKey)

    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(body))
}
func main() {
    if CaptchaSecretKey == "" || VerifySecret == "" || CaptchaSiteKey == "" {
        log.Fatal("Environment variables not set")
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        if r.Method == http.MethodPost {
            handlePost(w, r)
            return
        }
        handleGet(w, r)
    })

    log.Println("Server started at 127.0.0.1:8081")
    log.Fatal(http.ListenAndServe("127.0.0.1:8081", nil))
}
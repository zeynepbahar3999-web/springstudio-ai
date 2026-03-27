# SpringStudio Web App

Tam çalışan web uygulaması — 1220 AI modülünü tarayıcıdan kullan.

## Kurulum

```bash
npm install
cp .env.example .env.local
# .env.local içinde FAL_KEY, INVITE_CODES, JWT_SECRET düzenle
npm run dev
```

## Vercel'e Deploy

```bash
# 1. GitHub'a push et
git init && git add . && git commit -m "init"
gh repo create springstudio-app --private --push

# 2. vercel.com'da projeyi import et
# 3. Environment Variables ekle:
#    FAL_KEY = senin fal.ai API key'in
#    INVITE_CODES = spring2026,creator-beta (virgülle ayır)
#    JWT_SECRET = rastgele 64 karakter
# 4. Custom domain: springstudio.ai
```

## Kullanıcı Ekleme

`.env.local` veya Vercel dashboard'da `INVITE_CODES` değişkenine yeni kod ekle:

```
INVITE_CODES=spring2026,creator-beta,ahmet-test,mehmet-vip
```

Her kullanıcıya farklı kod ver. Kullanıcı kodu girince 30 gün geçerli oturum açılır.

## Modül Güncelleme

```bash
python3 parse_catalog.py    # Yeni modül dosyalarını parse et
cp module_configs.json public/data/modules.json
git add . && git commit -m "update modules" && git push
```

## Mimari

```
Kullanıcı → springstudio.ai → Login (davet kodu)
                                  ↓
                              JWT cookie (30 gün)
                                  ↓
                              Modül seç → Form doldur
                                  ↓
                              /api/generate (sunucu)
                                  ↓
                              fal.ai Queue API (FAL_KEY gizli)
                                  ↓
                              Sonuç → Kullanıcıya göster
```

Kullanıcı hiçbir zaman API key görmez. Tüm istekler sunucu üzerinden geçer.

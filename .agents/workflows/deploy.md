---
description: deploy pah-app to server at hearingtest.vuinghe.com
---

# Deploy PAH App → hearingtest.vuinghe.com

Workflow này để update code local lên server sau khi bạn đã code xong và muốn publish.

## Bước 1: Commit code

Đảm bảo code đã được save và commit:

```powershell
git add -A
git commit -m "Your commit message here"
```

## Bước 2: Build tar archive (loại bỏ node_modules và .next)

// turbo
```powershell
tar -czf "$env:TEMP\pah-app.tar.gz" --exclude='.next' --exclude='node_modules' --exclude='.git' --exclude='.env*' -C "c:\ANTIGRAVITY\HEARING TEST" pah-app
```

## Bước 3: Upload lên server

// turbo
```powershell
scp "$env:TEMP\pah-app.tar.gz" myserver:/tmp/pah-app.tar.gz
```

## Bước 4: Chạy update script trên server

// turbo
```powershell
ssh myserver "bash /home/haichu/pah-app/scripts/update.sh"
```

## Kết quả

- App rebuilt và restart qua PM2
- Live tại: http://hearingtest.vuinghe.com

---

## Push lên GitHub (tùy chọn)

Nếu đã cấu hình GitHub remote:

```powershell
git push origin master
```

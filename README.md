# Apple Store Monitor

監控 Apple Store 台灣各門市 iPhone / iPad 取貨庫存的網頁工具,部署於 https://asm.chrono.tw 。

## 開發

```shell
pnpm install
pnpm dev        # 開發伺服器
pnpm build      # 輸出到 dist/
pnpm preview    # 預覽 production build
pnpm sync       # 同步 Apple 官網商品資料(Ink 介面),寫入 data/devices.json
```

技術棧:Vite、React 19、Tailwind CSS 4、TanStack Table。推送到 `master` 會由 GitHub Actions 自動部署到 GitHub Pages。

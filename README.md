# Apple Store Monitor

監控 Apple Store 台灣各門市 iPhone / iPad / Mac mini / Mac Studio 取貨庫存的網頁工具,部署於 https://asm.chrono.tw 。

## 開發

```shell
pnpm install
pnpm dev        # 開發伺服器
pnpm build      # 輸出到 dist/
pnpm preview    # 預覽 production build
pnpm sync       # 同步 Apple 官網商品資料(Ink 介面),寫入 data/devices.json
```

## 商品資料

`pnpm sync` 以 `data/devices.json` 為基礎更新,不會整份重抓覆寫:

- 新型號:加入完整資料。
- 已有型號:只更新價格。`prices` 是價格歷史陣列,價格有變才 append,最後一筆就是目前價格;Apple 沒回應時維持舊資料。
- 商品頁不再列出的型號:標記 `discontinued: true`,網站不顯示,價格不再更新(不會刪除)。

同步時間寫在 `data/meta.json`,顯示於頁面底部。

技術棧:Vite、React 19、Tailwind CSS 4、TanStack Table。推送到 `master` 會由 GitHub Actions 自動部署到 GitHub Pages。

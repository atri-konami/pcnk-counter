# pcnk-counter

[![Deploy to GitHub Pages](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml/badge.svg)](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml)

パチンコのデータカウンターに表示される総回転数を、打ち出し（既定 250 玉 / 1000 円）ごとに記録するフロント専用アプリです。

公開 URL: https://atri-konami.github.io/pcnk-counter/

## できること

- 1行目は開始回転数、2行目以降は直前との差をその打ち出しの回転数として記録する
- 総玉数と平均を `75.0回転/k` 形式で表示する
- 貯玉は基準玉数で割った行数ぶん投資に含めず、消化した玉数を `貯玉250発 + 1000円` のように表示する
- 貯玉・基準玉数・投資単価・履歴はブラウザの localStorage に保存する
- セッションに名前をつけて保存し、過去セッションを後から閲覧・削除できる

## 開発（Docker + WSL）

WSL の Ubuntu で、プロジェクトディレクトリに入って起動します。

```bash
cd ~/hobby/pcnk-counter
docker compose up
```

ブラウザで http://localhost:5173/pcnk-counter/ を開きます。

## デプロイ

`master` / `main` への push で GitHub Pages に公開されます。成否は README 先頭のバッジか、[Actions の実行履歴](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml) で確認できます。

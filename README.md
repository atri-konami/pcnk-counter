# pcnk-counter

[![Deploy to GitHub Pages](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml/badge.svg)](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml)

パチンコのデータカウンターに表示される総回転数を、打ち出し（既定 250 玉 / 貸出 4 円 = 1000 円）ごとに記録するフロント専用アプリです。

公開 URL: https://atri-konami.github.io/pcnk-counter/

## できること

- 1行目は開始回転数、2行目以降は直前との差をその打ち出しの回転数として記録する
- 平均を `75.0回転/k` 形式で表示する。平均は 1000 円あたりの回転（対象の回転差分 ÷（円換算投資 ÷ 1000））。通常の打ち出しは 1 行 = 投資単価（基準玉数 × 貸出レート、既定 250 玉 × 4 円 = 1000 円）。マニュアル記録は使った持ち玉×貸出レート＋現金
- 貯玉は基準玉数で割った行数ぶん投資に含めず、消化した玉数を `貯玉250発 + 1000円` のように表示する。貯玉を使っていないときは円だけ表示する。持ち玉・投資額はタップで玉と円の表示を切り替えられる（持ち玉は端玉あり／なし、投資額は端玉なしの円換算）
- 貸出レート（4円 / 1円）と換金レート（280玉、250玉（4円等価）、1120玉、1000玉（1円等価））を設定できる。円換算は 1000 円に必要な玉数で計算する
- 大当たり時は回転数・前回からの現金（貯玉・持ち玉中は空欄）・終了時の持ち玉をまとめて記録する（入力欄は折りたたみ）。当たり行は平均対象外。現金ならその額、貯玉なら基準玉数ぶんを投資に加算する
- マニュアル記録は回転数・前回からの現金・記録時の残持ち玉をまとめて記録できる（入力欄は折りたたみ、初期は閉じたまま）。遊技終了時以外にも投資額・持ち玉を任意に入力できる。使った玉は現在の持ち玉との差分。現金と持ち玉は同時に記録できる。回転差分は円換算投資ぶん平均に含める
- 大当たり後はデータカウンターがリセットされるため、開始時と同様に新しい開始回転数を制限なく入力する
- 持ち玉がある間は記録しても投資を増やさず持ち玉から減算する。基準玉数未満の端数（持ち玉・貯玉とも）は平均に含めない
- 貯玉・基準玉数・貸出/換金レート・履歴はブラウザの localStorage に保存する
- セッションに名前をつけて保存し、過去セッションを後から閲覧・削除できる。一覧では 1k 平均と総回転、投資額（貯玉含む円換算、貯玉があるときは `(内 貯玉n玉)`）・持ち玉（玉と換金円）・円換算差額（持ち玉−投資、+/-）を表示する

## ホーム画面に追加（PWA）

本番（`https://atri-konami.github.io/pcnk-counter/`）を開いて、ブラウザのメニューからホーム画面に追加すると、アドレスバーのない独立した窓で使えます。

- Android Chrome: メニュー（︙）→「アプリをインストール」または「ホーム画面に追加」
- iPhone Safari: 共有 →「ホーム画面に追加」

LAN の `docker compose` 開発サーバは HTTPS ではないため、インストールできるかは端末・ブラウザ次第です。インストールの確認は本番 URL で行ってください。

## 開発（Docker + WSL）

WSL の Ubuntu で、プロジェクトディレクトリに入って起動します。

```bash
cd ~/hobby/pcnk-counter
docker compose up
```

同じ PC では http://localhost:5173/pcnk-counter/ を開きます。

同じ Wi-Fi のスマホなどからは、Windows 側の LAN IPv4（`ipconfig` の「ワイヤレス LAN アダプター」など）で開けます。

```text
http://<PCのLAN-IP>:5173/pcnk-counter/
```

コンテナ内の Network URL（`172.x` など）は使わないでください。届かないときは Windows ファイアウォールで TCP 5173 の受信を許可し、WSL2 の NAT 環境なら [LAN から WSL への転送](https://learn.microsoft.com/ja-jp/windows/wsl/networking#accessing-a-wsl-2-distribution-from-your-local-area-network-lan) が必要です。

## デプロイ

`master` / `main` への push で GitHub Pages に公開されます。成否は README 先頭のバッジか、[Actions の実行履歴](https://github.com/atri-konami/pcnk-counter/actions/workflows/deploy.yml) で確認できます。

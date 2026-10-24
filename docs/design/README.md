# Settings screen design proposals / 設定画面デザイン案

## Decision / 決定 (2026-10-25)

**EN:** The owner chose **Soft Flow**, with one change: a **header navigation menu** (taken from Control Desk's idea) so each page shows less. Pages: Home (pause button and auto switch) / Display mode / Keyword rules / Today's events / Connection. On mobile the header menu is a horizontally scrollable tab bar. Mobile keyword rules stay as one card per rule; desktop keeps a table. Phase 2 builds this. The two other directions stay here as reference only.

**JA:** オーナーは **Soft Flow** を選びました。変更点は1つ。Control Desk のメニューのように **ヘッダーにナビゲーション** を置き、1ページに出す内容を減らします。ページは、ホーム（通知ボタンと自動切り替え）／表示のモード／キーワードのルール／今日の予定／接続。スマホではヘッダーのメニューを横にスクロールできるタブにします。スマホのルールは1件ずつのカード、PCは表のままです。フェーズ2でこの形で作ります。ほかの2案は参考として残します。

The sections below describe the three Phase 0 proposals as submitted. / 以下は提出時の3案の説明です。

## English

Phase 0 only. Three offline HTML/CSS studies with deliberately different structures. All files are UTF-8 without BOM; no application code, external assets, dependencies or service calls.

| Direction | Structure and character | Mockups |
| --- | --- | --- |
| [Soft Flow](soft-flow.md) | One centered column, generous rounded cards and a large pill-shaped notification hero. | [Mobile](soft-flow/mobile.html) · [Desktop](soft-flow/desktop.html) |
| [Control Desk](control-desk.md) | Dense, rule-first dashboard with a desktop left sidebar and current Slack status strip. | [Mobile](control-desk/mobile.html) · [Desktop](control-desk/desktop.html) |
| [Bright Blocks](bright-blocks.md) | Colorful bento grid, chunky controls and horizontal desktop event cards on a timeline. | [Mobile](bright-blocks/mobile.html) · [Desktop](bright-blocks/desktop.html) |

### Review and capture
Open the HTML locally at 100% zoom. Use **390px mobile** and **1280px desktop** viewports, with full-page captures. The `mobile.png` / `desktop.png` files in each folder are full-page captures of the current mockups. No build or network access is required.

Mobile keyword rules are **individual editor cards**, as confirmed by the owner. Desktop rules use a table in its own scroll container. Bright Blocks converts its horizontal desktop timeline to vertical full-width event cards on mobile. Mobile pages are fluid below their 390px maximum; desktop pages also adapt to smaller viewports.

All six screens include a large pause/resume action, four pause durations (30 minutes / one hour / until the current event ends / until manually resumed), auto switching, three display modes, keyword rules, today's fictional events with individual overrides, and a Connect Slack button. Soft Flow and Control Desk illustrate pause; Bright Blocks illustrates resume. The Lesson override is expanded; open the other event editors to review their fields.

Copy is grouped in each HTML body. The disabled language selector is a placeholder for Phase 2 bilingual switching. Native form controls and disclosures are local only; buttons do not save, call services or mutate the calendar. Advanced settings outside these primary-screen studies are listed in each proposal's scope notes.

Screenshots, gitleaks and the PR remain the owner's assistant's tasks. No branches, commits or pushes. **Owner decision: choose one direction before continuing beyond Phase 0.** Mobile rule cards are already decided.

## 日本語

フェーズ0のみ。色だけでなく構造を変えた、外部通信なしのHTML/CSSモック3案です。全ファイルはUTF-8・BOMなし。アプリコード、外部素材、依存ライブラリ、サービス呼び出しは追加していません。

| 案 | 構成と特徴 | モック |
| --- | --- | --- |
| [Soft Flow](soft-flow.md) | 中央の1列、余白のある丸いカード、大きなピル型の通知ボタン。 | [スマホ](soft-flow/mobile.html) · [PC](soft-flow/desktop.html) |
| [Control Desk](control-desk.md) | ルールを先に置いた密度の高い管理画面。PCは左サイドバーと現在のSlackステータス欄を配置。 | [スマホ](control-desk/mobile.html) · [PC](control-desk/desktop.html) |
| [Bright Blocks](bright-blocks.md) | 色のブロックを大小で組み合わせ、厚いボタンとPCで横並びの予定タイムラインを配置。 | [スマホ](bright-blocks/mobile.html) · [PC](bright-blocks/desktop.html) |

### 確認と撮影
HTMLをローカルで開き、ズーム100%、**スマホ幅390px／PC幅1280px**でページ全体を撮影してください。各フォルダの `mobile.png` / `desktop.png` は、現在のモックのページ全体の画像です。ビルド・ネット接続は不要です。

スマホのキーワードは、回答に従って**1ルール1編集カード**に変更しました。PCの表は専用の横スクロール領域に収めています。Bright Blocksの横並びタイムラインはスマホで縦軸と全幅カードへ切り替わります。スマホ版は最大390pxの範囲で縮み、PC版も狭い画面に対応します。

6画面すべてに大きな通知停止・再開ボタン、停止時間4択（30分／1時間／今の予定が終わるまで／自分で再開するまで）、自動切り替え、表示モード3択、ルール、今日の架空の予定と個別上書き、Slack接続を配置。Soft FlowとControl Deskは停止操作、Bright Blocksは再開操作の例です。Lessonの上書きは展開済みで、ほかの予定も開けます。

文言は各HTML本文にまとめています。無効な言語欄はフェーズ2での2言語対応の配置見本。選択と開閉はブラウザ標準のローカル動作だけで、ボタンによる保存・通信・カレンダー変更はありません。主要画面の比較に含めない詳細設定は各案の範囲に記載しました。

撮影、gitleaks、PRはオーナーのアシスタントが担当します。ブランチ作成・コミット・pushは行いません。**フェーズ0の後は、オーナーが案を選ぶのを待ちます。** スマホの個別ルールカードは確定済みです。

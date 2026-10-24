# Control Desk

## English

### Concept and structure
A dense, table-first utility dashboard. A permanent desktop left sidebar and a current Slack status bar precede a full-width rule table. Display and notification controls share the next row; the agenda and connection fill the last row. On mobile, navigation wraps at the top and rules remain first as individual editor cards.

### Colors
Background `#EDF1F5`, surface `#FFFFFF`, text/sidebar `#18293B`, secondary text `#526276`, accent `#174EA6`, tint `#E8EFFC`, border `#CAD3DF`.
Labels and checked states accompany color cues.

### Typography
Local system fonts only: system-ui, Segoe UI, Yu Gothic, Meiryo, sans-serif. 13px desktop body, 12px table/status text, 16px section titles and 28px page heading. Mobile body returns to 14px. No downloaded fonts or other network resources.

### Component shapes
6px card corners, 4px rectangular controls, compact spacing, an aligned rule table and a dark status strip. Touch controls remain at least 44px high. Visible keyboard focus is provided. The visual switch is 48 × 28px inside a clickable label at least 44px high.

### Strengths
Rules, live-status placement and navigation are immediately inspectable; desktop space supports frequent configuration work.

### Weaknesses
The denser visual language is more formal. Rules precede the notification action, so mobile users must scroll to pause; the navigation provides a direct notification anchor.

### Review notes
- [Mobile HTML](control-desk/mobile.html): use a 390px viewport at 100% zoom. Each keyword rule has its own editor card, with all fields, enable/ignore checkboxes and ordering/deletion actions. There is no mobile rule table.
- [Desktop HTML](control-desk/desktop.html): use a 1280px viewport. Rules use a table; any table overflow is contained by its own scroll region.
- Both include all required controls, four pause durations, all three display modes, today's three fictional events and a Connect Slack button. The Lesson override is expanded; the other two can be opened with native disclosure controls. Overrides include text, emoji, notifications, ignore and recurrence scope.
- The primary action shows pause while notifications are receiving. These are two example states of one primary button.
- Slack is unconnected. Any status/setting preview is explicitly a sample, not fetched account data.
- Japanese copy is grouped in the HTML body. The disabled language selector reserves space for English/Japanese switching in Phase 2. This proposal does not implement translation logic.
- Native inputs and disclosures work locally. Save, notification, connect, add, order and delete buttons are visual only; no service calls or persistence.
- Calendar selection, exclusions, overlap handling, time buffers and import/export are outside these primary-screen studies and need a later detailed design against SPEC §3-5.
- Files are UTF-8 without BOM. Existing PNGs are untouched; the owner's assistant will retake screenshots, run gitleaks and prepare the PR.

### Owner question
Which of the three directions should proceed? Mobile rule cards are the confirmed choice and no longer an open question.

## 日本語

### コンセプトと構成
表を起点にした密度の高い管理画面。PCは左サイドバーと現在のSlackステータス欄を設け、全幅のルール表を先に表示。次の行で表示と通知、その下で予定と接続を並べます。スマホは上部に折り返すナビゲーションを置き、先頭のルールを個別編集カードにします。

### 色
背景 `#EDF1F5`、面 `#FFFFFF`、本文・サイドバー `#18293B`、補助文字 `#526276`、アクセント `#174EA6`、淡色面 `#E8EFFC`、罫線 `#CAD3DF`。
色に加えてラベルとチェック状態で意味を伝えます。

### 文字
端末の system-ui、Segoe UI、Yu Gothic、Meiryo、sans-serif を使用。PC本文13px、表と状態欄12px、節見出し16px、ページ見出し28px。スマホ本文は14pxに戻します。 外部フォントや通信は使いません。

### 部品の形
6pxのカードと4pxの操作部品。狭めの間隔、整列したルール表、濃色の状態欄。タッチする操作部品は44px以上を確保します。 キーボードのフォーカスを表示します。スイッチ自体は48×28pxで、高さ44px以上の文字ラベル全体が操作対象です。

### 良い点
ルール、状態欄、ナビゲーションをすぐ確認でき、PCでの頻繁な設定作業に向きます。

### 弱い点
密度が高く硬めの印象です。スマホでは通知ボタンよりルールが先なのでスクロールが必要です。ナビの通知リンクで直接移動できます。

### 確認事項・範囲
- スマホは幅390px、ズーム100%で確認。キーワードは1件ずつの編集カードで、全項目、有効・無視、並べ替え・削除を配置しています。スマホ版にルール表はありません。
- PCは幅1280pxで確認。ルール表が広い場合も、横スクロールは表の領域内に収めます。
- 両方に必須の操作、停止時間4択、表示モード3択、架空の予定3件、Slack接続ボタンを配置。Lessonの上書きは展開済みです。他の予定も開閉できます。文言・絵文字・通知・無視・この回だけ／毎回を確認できます。
- 通知受信中で、「通知を止める」が主要操作です。 実装時は同じ1つのボタンの状態を切り替えます。
- Slackは未接続。状態や設定のプレビューは見本と明記し、実際のアカウント情報を含めていません。
- 日本語文言はHTML本文にまとめています。無効な言語欄はフェーズ2での日本語／英語切り替え用の配置見本です。
- 選択部品・開閉はブラウザ標準の動作だけです。保存・通知・接続・追加・順序変更・削除は見本で、通信も保存も行いません。
- カレンダー選択、除外、重複の判断、前後の余白、書き出し・読み込みは、この主要画面の比較後に仕様§3-5に沿って詳細設計します。
- UTF-8・BOMなしで保存。既存PNGは変更せず、オーナーのアシスタントが撮影し直し、gitleaksとPR作成を担当します。

### オーナーへの質問
進める案はどれにしますか。スマホのルールは個別カードに確定しており、未決事項ではありません。

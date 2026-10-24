# Bright Blocks

## English

### Concept and structure
A bento board with unequal blocks: a seven-column yellow notification hero beside a five-column peach connection block, followed by lavender display settings beside rules. A full-width green timeline contains three horizontal event cards on desktop. Mobile stacks the blocks and turns that timeline into a vertical rail with full-width cards, without horizontal page scrolling.

### Colors
Background `#FFF9EC`, text/border `#27233F`, secondary text `#625C72`, accent `#5540B5`, lavender `#ECE7FF`, hero yellow `#FBE08B`, connection peach `#F8DCD4`, agenda green `#E9F1E6`, white `#FFFFFF`.
Labels and checked states accompany color cues.

### Typography
Local system fonts only: system-ui, Segoe UI, Yu Gothic, Meiryo, sans-serif. 14px body, 44px desktop / 34px mobile page heading, 28px section numbers and an oversized connection stamp. No downloaded fonts or other network resources.

### Component shapes
18px corners, 2px outlines, 4px offset shadows, chunky buttons and event cards attached to a timeline. Shadows fit within the page gutters. Visible keyboard focus is provided. The visual switch is 48 × 28px inside a clickable label at least 44px high.

### Strengths
Distinctive personality and strong grouping; connection is prominent and the event sequence is easy to scan.

### Weaknesses
More visual stimulation and uneven desktop block heights. Opening an event editor increases one timeline card’s height; long translations need careful spacing.

### Review notes
- [Mobile HTML](bright-blocks/mobile.html): use a 390px viewport at 100% zoom. Each keyword rule has its own editor card, with all fields, enable/ignore checkboxes and ordering/deletion actions. There is no mobile rule table.
- [Desktop HTML](bright-blocks/desktop.html): use a 1280px viewport. Rules use a table; any table overflow is contained by its own scroll region.
- Both include all required controls, four pause durations, all three display modes, today's three fictional events and a Connect Slack button. The Lesson override is expanded; the other two can be opened with native disclosure controls. Overrides include text, emoji, notifications, ignore and recurrence scope.
- The primary action shows resume while notifications are paused until manual resumption. These are two example states of one primary button.
- Slack is unconnected. Any status/setting preview is explicitly a sample, not fetched account data.
- Japanese copy is grouped in the HTML body. The disabled language selector reserves space for English/Japanese switching in Phase 2. This proposal does not implement translation logic.
- Native inputs and disclosures work locally. Save, notification, connect, add, order and delete buttons are visual only; no service calls or persistence.
- Calendar selection, exclusions, overlap handling, time buffers and import/export are outside these primary-screen studies and need a later detailed design against SPEC §3-5.
- Files are UTF-8 without BOM. Existing PNGs are untouched; the owner's assistant will retake screenshots, run gitleaks and prepare the PR.

### Owner question
Which of the three directions should proceed? Mobile rule cards are the confirmed choice and no longer an open question.

## 日本語

### コンセプトと構成
大小を付けたブロックのボード。PCは黄色の通知を7列、桃色の接続を5列にし、その下に薄紫の表示設定とルールを並べます。緑の横長タイムラインには予定カードを3件横並びに配置。スマホはブロックを積み、タイムラインも縦軸と全幅カードに変えて、ページの横スクロールを避けます。

### 色
背景 `#FFF9EC`、本文・輪郭 `#27233F`、補助文字 `#625C72`、アクセント `#5540B5`、薄紫 `#ECE7FF`、通知の黄 `#FBE08B`、接続の桃 `#F8DCD4`、予定の緑 `#E9F1E6`、白 `#FFFFFF`。
色に加えてラベルとチェック状態で意味を伝えます。

### 文字
端末の system-ui、Segoe UI、Yu Gothic、Meiryo、sans-serif を使用。本文14px、ページ見出しはPC44px・スマホ34px。28pxの節番号と大きな接続スタンプで強弱を付けます。 外部フォントや通信は使いません。

### 部品の形
18pxの角丸、2pxの輪郭、4pxずらした影、厚みのあるボタン、軸につながる予定カード。影はページ余白の内側に収めます。 キーボードのフォーカスを表示します。スイッチ自体は48×28pxで、高さ44px以上の文字ラベル全体が操作対象です。

### 良い点
個性と区分が明確。接続操作が目立ち、予定の順序も追いやすい。

### 弱い点
視覚的な刺激が多く、PCではブロックの高さに差が出ます。上書きを開くと該当の予定カードが伸び、長い翻訳文には余白調整が必要です。

### 確認事項・範囲
- スマホは幅390px、ズーム100%で確認。キーワードは1件ずつの編集カードで、全項目、有効・無視、並べ替え・削除を配置しています。スマホ版にルール表はありません。
- PCは幅1280pxで確認。ルール表が広い場合も、横スクロールは表の領域内に収めます。
- 両方に必須の操作、停止時間4択、表示モード3択、架空の予定3件、Slack接続ボタンを配置。Lessonの上書きは展開済みです。他の予定も開閉できます。文言・絵文字・通知・無視・この回だけ／毎回を確認できます。
- 通知停止中で、手動で再開するまで停止する状態を表示。「通知を再開する」が主要操作です。 実装時は同じ1つのボタンの状態を切り替えます。
- Slackは未接続。状態や設定のプレビューは見本と明記し、実際のアカウント情報を含めていません。
- 日本語文言はHTML本文にまとめています。無効な言語欄はフェーズ2での日本語／英語切り替え用の配置見本です。
- 選択部品・開閉はブラウザ標準の動作だけです。保存・通知・接続・追加・順序変更・削除は見本で、通信も保存も行いません。
- カレンダー選択、除外、重複の判断、前後の余白、書き出し・読み込みは、この主要画面の比較後に仕様§3-5に沿って詳細設計します。
- UTF-8・BOMなしで保存。既存PNGは変更せず、オーナーのアシスタントが撮影し直し、gitleaksとPR作成を担当します。

### オーナーへの質問
進める案はどれにしますか。スマホのルールは個別カードに確定しており、未決事項ではありません。

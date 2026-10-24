# Soft Flow

## English

### Concept and structure
A quiet, centered single-column ritual. The generous pill-shaped pause hero comes first, followed by display settings, a vertical daily agenda, keyword rules and connection. Desktop deliberately keeps the same calm reading flow instead of becoming a dashboard.

### Colors
Background `#F5F4EF`, surface `#FFFFFF`, text `#243D35`, secondary text `#52655D`, accent `#27664E`, tint `#E4EFE7`, border `#D2DED5`.
Labels and checked states accompany color cues.

### Typography
Local system fonts only: system-ui, Segoe UI, Yu Gothic, Meiryo, sans-serif. 14px body, 19px section titles, 28–40px page heading; relaxed 1.65 line height. No downloaded fonts or other network resources.

### Component shapes
30px rounded cards; 14px field corners; a 92px-high desktop pill action (88px on mobile), generous section gaps and a soft vertical agenda line. Visible keyboard focus is provided. The visual switch is 48 × 28px inside a clickable label at least 44px high.

### Strengths
Easy to approach, with one unmistakable primary action and a predictable reading order on both devices.

### Weaknesses
The single column is intentionally long; frequent rule editing requires scrolling and uses less desktop width.

### Review notes
- [Mobile HTML](soft-flow/mobile.html): use a 390px viewport at 100% zoom. Each keyword rule has its own editor card, with all fields, enable/ignore checkboxes and ordering/deletion actions. There is no mobile rule table.
- [Desktop HTML](soft-flow/desktop.html): use a 1280px viewport. Rules use a table; any table overflow is contained by its own scroll region.
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
中央に寄せた1列の落ち着いた構成。大きなピル型の通知ボタンを先頭に置き、表示設定、縦の予定一覧、キーワード、接続へ進みます。PCでもダッシュボードにせず、ゆったりした読み順を守ります。

### 色
背景 `#F5F4EF`、面 `#FFFFFF`、本文 `#243D35`、補助文字 `#52655D`、アクセント `#27664E`、淡色面 `#E4EFE7`、罫線 `#D2DED5`。
色に加えてラベルとチェック状態で意味を伝えます。

### 文字
端末の system-ui、Segoe UI、Yu Gothic、Meiryo、sans-serif を使用。本文14px、節見出し19px、ページ見出し28〜40px。行間は1.65でゆったり。 外部フォントや通信は使いません。

### 部品の形
30pxの角丸カード、14pxの入力欄、PCで高さ92px・スマホで88pxのピル型ボタン。広い節間と柔らかな縦線の予定一覧。 キーボードのフォーカスを表示します。スイッチ自体は48×28pxで、高さ44px以上の文字ラベル全体が操作対象です。

### 良い点
最初に操作する場所が明快。両端末で読み順が揃い、初めてでも迷いにくい。

### 弱い点
意図的に縦長です。ルールを頻繁に編集する場合はスクロールが必要で、PCの横幅も控えめに使います。

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

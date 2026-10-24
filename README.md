# calendar-slack-status

A Google Apps Script web app that configures calendar-based Slack status and notification switching. Phase 2 provides settings and read-only calendar access; Slack connection and automation arrive in Phase 3.

## Development

Use a Node version supported by `package.json`, then run:

```sh
npm install
npm test
npm run lint
npm run build
npm run preview
```

The offline preview runs at http://127.0.0.1:4173. It uses only bundled assets and in-memory fictional Team sync, Lesson and Focus time events. Saves last until the page reloads. `npm run preview:build` creates a standalone `preview/index.html` that can also be opened directly without a server or network. Review at 390px and 1280px; keyword rows become individual editor cards on phones.

`npm run build` produces `dist/Code.js`, `dist/Index.html`, and `dist/appsscript.json`. Copy `.clasp.json.example` to the ignored `.clasp.json`, substitute your own script ID locally, then use clasp to push `dist/`. Deploy as a web app executing as **the user accessing the app**. Only the calendar read-only OAuth scope is requested. No triggers, Slack requests, credentials, or external assets are used in this phase.

Settings use a version-1 JSON envelope in each user's UserProperties. Invalid or unknown-version data falls back to defaults; known versions are sanitized field by field. Status text is always capped at Slack's 100-character limit with no prefix; legacy values for these removed controls are normalized on loading and saving. Margins are 0–1440 whole minutes. Empty calendar selection reads no calendars. Events cover today through the end of the date one week ahead, using the time zone of the user's default calendar (falling back to the Apps Script project time zone). The same zone is used to display event times. Save settings to refresh events after changing calendars. Recurring occurrences have distinct IDs and share the CalendarApp iCal series ID, scoped by calendar.

The header provides four pages: Display mode (opens first), Keyword registration, Today's events and Connection. Display mode starts directly with How to reflect events in your status: Event title / Custom / None. Custom reveals a Status text field; emoji and Pause notifications during events are shared settings. In Phase 3, switching will start automatically once Slack and the calendar are connected; disconnecting Slack will stop it. Keyword registration uses a desktop table and collapsible mobile cards; disabled rules are dimmed while their enable control stays fully visible. Calendar selection, exclusions, overlaps and margins are on Connection. Language defaults to browser language until a saved preference exists; save to persist a language change. Edits are kept in memory while changing pages; use Save settings to persist. Connect Slack and Disconnect are both disabled until Phase 3.

## 日本語

Googleカレンダーに合わせたSlackステータス・通知切り替えの設定画面です。フェーズ2は設定の保存・読込とカレンダーの読み取り専用アクセスまでです。Slack接続と自動処理はフェーズ3です。

上記のコマンドで依存関係をインストールし、テスト・lint・ビルドを実行できます。`npm run preview`で http://127.0.0.1:4173 を開きます。`npm run preview:build`で生成する`preview/index.html`は直接開くこともでき、ネット接続は不要です。架空の予定だけを使い、保存はページを再読み込みするまで有効です。390pxと1280pxで確認してください。

`npm run build`でclasp用の`dist/`を生成します。`.clasp.json.example`をローカルの`.clasp.json`へコピーし、手元だけでスクリプトIDを設定してください。ウェブアプリは「アクセスしているユーザーとして実行」で公開します。要求する権限はカレンダーの読み取り専用だけです。

設定は各ユーザーのUserPropertiesにバージョン付きJSONで保存し、読み込み時に検証します。不正データ・未知バージョンは初期設定に戻ります。ステータスは接頭辞なし・Slackの上限100文字に固定し、旧設定の接頭辞と文字数上限も読込・保存時に正規化します。前後の余白は0〜1440分です。カレンダーを選ばない場合は予定を読みません。対象期間は今日から1週間先の日の終わりまでです。日付の切れ目と予定の表示時刻には、利用者のメインカレンダーのタイムゾーンを使います（取れないときはプロジェクトのタイムゾーン）。

ヘッダーから「表示モード／キーワード登録／今日の予定／接続」の4ページを切り替えます。最初は表示モードで、「ステータスへの反映方式」のカードから始まります。「予定名／カスタム／なし」を選び、カスタムを選ぶと「ステータス名」が表示されます。絵文字と「予定中は通知を止める」は共通設定です。フェーズ3では、Slackとカレンダーがつながると自動で切り替えを始め、「接続を解除」で停止します。キーワード登録はPCで表、スマホで開閉できるカードです。無効なルールは暗く表示し、有効に戻すスイッチ・チェックボックスは通常の明るさを保ちます。カレンダー選択・除外・重複・余白は接続ページです。言語は保存した設定がなければブラウザから選びます。ページ間の変更は一時保持され、「設定を保存」で永続化します。「Slackとつなぐ」「接続を解除」はどちらもフェーズ3まで無効です。

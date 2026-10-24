# calendar-slack-status

A Google Apps Script web app that switches your Slack status and notifications to match Google Calendar events. MIT licensed. Phase 3 adds user-token OAuth, five-minute automation, disconnect, and Check now.

Follow [Setup](docs/SETUP.md) to create a Slack app from the manifest, deploy with clasp, configure Script properties, and connect. Deploy as **the user accessing the app**, accessible to anyone with a Google account. Google scopes are limited to calendar read-only, external requests, trigger management and send-mail. Slack uses only `users.profile:read`, `users.profile:write`, `dnd:write` user scopes. Tokens and team metadata stay in UserProperties; app credentials and the generated signing secret stay in ScriptProperties. The public OAuth client ID necessarily appears in the authorization URL; the client secret never does.

Connecting starts automation; disconnecting stops it. Manual Slack statuses are protected, unchanged settings avoid write calls, and event endings rely on Slack expiry. Failed writes retry next tick; invalid credentials stop the trigger and display a reconnect banner. Connection shows the last check/result and provides **Check now**. See [scenario-to-test mapping](docs/PHASE3-TESTS.md) for coverage and limitations.

## Development

Use a Node version supported by `package.json`:

```sh
npm install
npm test
npm run lint
npm run build
npm run preview:build
npm run preview
```

Tests run against an ephemeral HTTP fake Slack server bound only to 127.0.0.1. No real Google or Slack service is contacted. `build` produces `dist/Code.js`, `dist/Index.html` and `dist/appsscript.json`; `.clasp.json` stays ignored. Core decisions remain pure and independent of both services.

The preview runs at http://127.0.0.1:4173 and uses bundled assets and fictional in-memory events. Open `?connection=connected`, `?connection=not_connected`, or `?connection=needs_reconnect` to preview connection states, then select Connection in the header. Saves last until reload. `preview/index.html` also opens directly without a server. Review at 390px and 1280px. The four pages are Display mode (initial), Keyword registration, Today's events and Connection; keyword rows become cards on phones. Language follows the browser until a preference is saved.

Settings use a validated versioned JSON envelope in UserProperties. Invalid/unknown data falls back to defaults. Status text is capped at 100 characters. Event overrides take priority over keywords and display mode. Margins are 0–1440 whole minutes; an empty calendar selection reads nothing. Upcoming events use the primary calendar's time zone, falling back to the project zone. Automation uses epoch timestamps across DST changes.

## First-day dry run

Set the Script property `DRY_RUN=true` **before connecting**. Leave it on for one day, use Check now and scheduled ticks, and inspect Apps Script Executions for intended form calls, expiry seconds and DND minutes. Reads are allowed; writes and applied-state updates are suppressed. Test manual status protection, rules, overlaps and event endings. Dry-run logs may contain event titles. After a satisfactory day, set `DRY_RUN=false` or remove it and verify actual Slack behavior. The flag affects all project users. Full steps are in [Setup](docs/SETUP.md).

## 日本語

Googleカレンダーに合わせてSlackのステータス・通知を切り替える、MITライセンスのApps Scriptウェブアプリです。フェーズ3ではユーザートークンのOAuth接続・5分おきの自動実行・接続解除・今すぐ確認を追加しました。

[導入手順](docs/SETUP.md#日本語) に従ってSlackアプリを作り、claspで公開し、スクリプトプロパティを設定してください。実行者は **アクセスしているユーザー**、アクセスは **Googleアカウントを持つ全員** にします。Google権限はカレンダー読み取り専用・外部通信・トリガー管理・メール送信だけ、Slackは上記3つのユーザースコープだけです。トークン・接続先はUserProperties、アプリ認証情報・署名用シークレットはScriptPropertiesに保存します。公開情報であるクライアントIDは認証URLに必要ですが、クライアントシークレットはブラウザーに送りません。

接続すると自動実行し、解除すると停止します。手動ステータスを保護し、同じ内容への書き込みは省略します。予定終了時はSlackの期限に任せます。失敗した呼び出しは次回に再試行し、認証無効時はトリガーを削除して再接続バナーを表示します。接続ページで最終確認・結果を見たり、**今すぐ確認** を実行できます。

上記の開発コマンドでテスト・lint・ビルド・プレビューを実行します。テストは127.0.0.1の仮Slackサーバーのみを使い、実際のGoogleやSlackには通信しません。[テスト対応表](docs/PHASE3-TESTS.md) に網羅範囲と制約を記載しています。

プレビューは架空の予定を使い、保存は再読み込みまで有効です。URLの `?connection=connected` / `not_connected` / `needs_reconnect` で接続状態を切り替え、接続ページを選べます。生成した `preview/index.html` は直接開けます。390px・1280pxで確認してください。表示モード・キーワード登録・今日の予定・接続の4ページで、スマホではルールがカードになります。言語は初回にブラウザーから選び、保存すると維持します。

設定はUserPropertiesにバージョン付きで保存・検証します。ステータスは100文字まで。優先順位は予定ごとの設定→キーワード→表示モードです。余白は0〜1440分で、カレンダー未選択なら読みません。予定一覧はメインカレンダーのタイムゾーン（取れなければプロジェクト設定）を使い、自動実行は夏時間も含めエポック時刻で判断します。

初日は **接続前に `DRY_RUN=true`** を設定し、1日ログを確認してください。Slackへの書き込み・適用済み状態の更新はせず、読み取りと呼び出し予定の記録だけを行います。予定名をログに含むため非公開で扱ってください。問題がなければ `false` にするか削除し、実際の動作を確認します。フラグは全利用者共通です。詳細は [導入手順](docs/SETUP.md#日本語) を参照してください。

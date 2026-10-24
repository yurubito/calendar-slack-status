# Setup

1. In Slack's app management page, choose **Create New App → From a manifest**. Paste [slack-app-manifest.json](slack-app-manifest.json), selecting your own workspace. It requests user scopes only: `users.profile:read`, `users.profile:write`, `dnd:write`. No bot, events, or token rotation is needed. Installation may require administrator approval.
2. Install dependencies and clasp, then create an Apps Script project:

   ```sh
   npm install
   npm install -g @google/clasp
   clasp login
   clasp create --type standalone --title "Calendar Slack Status" --rootDir dist
   npm run build
   clasp push
   ```

   For an existing project, copy `.clasp.json.example` to `.clasp.json` and enter your own script ID locally. Never commit clasp configuration or credentials. Enable the Apps Script API for your account if requested.

3. In Apps Script, choose **Deploy → New deployment → Web app**: **Execute as: User accessing the web app**; **Who has access: Anyone with a Google account**. Authorize calendar read-only, external requests, trigger management and send-mail permissions. Organization policies or Google verification requirements may restrict access.
4. In **Project Settings → Script properties**, set `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` from Slack's Basic Information page. Set `DRY_RUN` to the exact string `true` for the first day. Optional `REDIRECT_URL` overrides the deployed web app service URL. `OAUTH_STATE_SECRET` is generated automatically; do not publish it or change it during authorization. Never put credentials in code, logs, or screenshots.
5. In Slack **OAuth & Permissions → Redirect URLs**, replace the manifest placeholder with the exact deployed `/exec` URL (or `REDIRECT_URL`) and save. The URL contains a deployment ID, not the editor's script ID. For updates, use **Manage deployments → Edit → New version**, preserving the deployment URL.
6. Open the app with your Google account. On **Connection**, select calendars and save settings, then **Connect Slack**. Approve access using the same browser and Google account; authorization state expires after ten minutes and is single use. Return to the app to see the team and connection status. Connecting creates one five-minute trigger owned by that user. Each user connects individually.
7. **First-day dry run:** leave `DRY_RUN=true` for one day, choose harmless test events and notification settings, save, then use **Check now**. Inspect **Apps Script → Executions** for `tick` / `checkNow`. Logs show intended profile form fields (JSON-string `profile`, expiry in seconds) and DND minutes. Reads still occur; writes and applied-state updates do not. Test rules, overlaps, manual Slack status and event endings. Dry-run logs contain event titles: keep them private. The flag affects all project users.
8. After reviewing that day, set `DRY_RUN=false` or remove it. Use **Check now**, verify status expiry and notifications in Slack, and inspect the next scheduled execution. Triggers run approximately every five minutes, not at exact event boundaries.
9. **Disconnect** and confirm to stop switching. Revocation is attempted, but the user's trigger, token, team, pending state and last-run information are deleted even if Slack revocation fails. If Slack is unreachable, revoke the app manually in Slack too. Settings remain saved.

Invalid authorization stops the trigger and displays a reconnect banner. One bilingual reconnect email is attempted per UTC date. Later manual checks can attempt another email on a later date; daily reminders are not scheduled after trigger removal. Reconnecting resumes automation. The recipient is the default primary calendar ID (normally the user's Google email), avoiding an additional identity scope. Verify delivery during deployment, particularly for unusual calendar identifiers. Addresses are never logged or stored in source.

**Troubleshooting:** inspect Apps Script **Executions** and Connection's last result. `error:rate_limited` skips until the next tick; `error:http_error` / `error:transport` retry next tick. Production logs contain event IDs/counts and fixed error codes, never titles, tokens or secrets. Monitor Google's runtime/service quotas in the dashboard; service exceptions are logged as `error:internal`. Deployment permissions, mail delivery and Slack approval require real-environment verification.

# 日本語

1. Slackのアプリ管理で **Create New App → From a manifest** を選び、[slack-app-manifest.json](slack-app-manifest.json) を貼り付けます。ユーザースコープは `users.profile:read`、`users.profile:write`、`dnd:write` だけです。Bot・イベント購読・トークンローテーションは使いません。管理者の承認が必要な場合があります。
2. 上記のコマンドで依存関係とclaspを導入し、`clasp login`、`clasp create`、`npm run build`、`clasp push` を実行します。既存プロジェクトなら `.clasp.json.example` を `.clasp.json` にコピーし、手元だけでIDを設定します。認証情報をコミットしないでください。必要ならApps Script APIを有効にします。
3. Apps Scriptで **デプロイ → 新しいデプロイ → ウェブアプリ** を選び、実行者を **アクセスしているユーザー**、アクセスを **Googleアカウントを持つ全員** にします。カレンダー読み取り専用・外部通信・トリガー管理・メール送信を許可します。組織のポリシーやGoogleの確認が必要な場合があります。
4. **プロジェクトの設定 → スクリプトプロパティ** にSlackの `SLACK_CLIENT_ID`、`SLACK_CLIENT_SECRET` を設定します。初日は `DRY_RUN` を文字列 `true` にします。任意の `REDIRECT_URL` でウェブアプリURLを上書きできます。`OAUTH_STATE_SECRET` は自動生成されるため、公開・認証中の変更をしないでください。秘密をコード・ログ・画像に入れないでください。
5. Slackの **OAuth & Permissions → Redirect URLs** で、仮のURLを実際の `/exec` URL（または `REDIRECT_URL`）へ置き換えて保存します。URLのIDはデプロイIDで、スクリプトIDとは異なります。更新は **デプロイを管理 → 編集 → 新バージョン** で行い、URLを維持します。
6. 同じブラウザー・Googleアカウントでアプリを開き、接続ページでカレンダーを選んで保存し、**Slackとつなぐ** を押します。認証は10分間・1回限りです。成功すると接続先を表示し、その利用者の5分おきのトリガーを1つ作ります。利用者ごとに接続が必要です。
7. **初日は `DRY_RUN=true` のまま1日確認します。** 無害なテスト予定と通知設定を保存し、**今すぐ確認** を押します。Apps Scriptの **実行数** で `tick` / `checkNow` を確認します。JSON文字列のステータス・秒単位の期限・DND分数を記録します。読み取りはしますが、Slackへの書き込み・適用済み状態の保存はしません。ルール・重複・手動ステータス・予定終了を確認してください。ログには予定名が含まれるので非公開で扱います。フラグは全利用者共通です。
8. 1日の確認後、`DRY_RUN=false` にするか削除し、**今すぐ確認** と次の定期実行で実際のステータス・期限・通知を確認します。トリガーは約5分間隔で、予定の境界時刻ちょうどには動きません。
9. 停止は **接続を解除** で確認します。Slackでの無効化を試み、失敗してもトークン・接続情報・認証状態・トリガー・最終実行情報を削除します。通信できなかった場合はSlack側でも手動で取り消してください。設定は残ります。

認証無効時はトリガーを削除し、再接続バナーを表示します。メールはUTC日付ごとに最大1回試みます。後日の手動確認でも再通知できますが、削除後の毎日の定期メールはありません。接続ページでつなぎ直すと再開します。追加の本人確認スコープを要求しないため、宛先はメインカレンダーのID（通常は本人のGoogleメール）です。特殊なIDの場合を含め、導入時に配信を確認してください。アドレスをコード・ログに残しません。

ログはApps Scriptの **実行数**、結果は接続ページで確認します。`error:rate_limited` は次回へ延期、`error:http_error` / `error:transport` は次回再試行です。通常ログは予定ID・件数・固定エラーコードだけです。Googleの実行時間・サービス上限はダッシュボードで確認してください。サービス例外は `error:internal` と記録します。実際のデプロイ・配信・権限・Slack承認は導入環境で確認が必要です。

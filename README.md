# Markwell

任意の Web ページ上のテキストを蛍光ペンのようにハイライトし、AI が複数ハイライトから論考エッセイを合成する Chrome 拡張機能。

開発開始日: 2026-05-18

## パフォーマンス（高頻度更新サイト）

Slack やチャット UI のように DOM が常時更新されるページでは、Markwell の再アンカー処理が負荷になることがあります。Options の `blocked_url_patterns` に該当 URL（例: `*://app.slack.com/*`）を追加して content script を無効化することを推奨します。

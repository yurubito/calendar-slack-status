import { messages } from './strings';
export interface Connection {
  connection: 'connected' | 'not_connected' | 'needs_reconnect';
  team?: string;
  lastRun?: number;
  lastResult?: string;
}
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
export function reconnectBanner(c: Connection, locale: 'en' | 'ja') {
  return c.connection === 'needs_reconnect'
    ? `<aside class="panel reconnect-banner" role="alert">${messages[locale].reconnect}</aside>`
    : '';
}
export function connectionMarkup(c: Connection, locale: 'en' | 'ja') {
  const t = messages[locale];
  const result =
    c.lastResult === 'applied'
      ? t.resultApplied
      : c.lastResult === 'nothing'
        ? t.resultNothing
        : c.lastResult === 'dry_run'
          ? t.resultDryRun
          : c.lastResult?.startsWith('error:')
            ? `${t.resultError} (${c.lastResult.slice(6)})`
            : '—';
  return `<section class="panel"><h2>${t.connection}</h2><p>${c.connection === 'connected' ? `${t.connected} ${esc(c.team)}` : c.connection === 'needs_reconnect' ? t.reconnect : t.notConnected}</p><div class="connection-actions"><button type="button" data-action="connect">${t.connect}</button><button type="button" data-action="disconnect" ${c.connection === 'not_connected' ? 'disabled' : ''}>${t.disconnect}</button><button type="button" data-action="checkNow" ${c.connection === 'not_connected' ? 'disabled' : ''}>${t.checkNow}</button></div><p>${t.lastCheck}: ${c.lastRun === undefined ? '—' : esc(new Date(c.lastRun).toLocaleString(locale))}</p><p>${t.lastResult}: ${esc(result)}</p></section>`;
}

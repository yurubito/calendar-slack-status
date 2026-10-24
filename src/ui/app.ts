import {
  connectionMarkup,
  reconnectBanner,
  type Connection,
} from './connection';
import type {
  CalendarEvent,
  EventOptions,
  EventOverride,
  Rule,
  Settings,
} from '../core/types';
import { messages } from './strings';
import { mergeOverride, reorder, ruleSummary, updateCards } from './logic';
import type { RuleCards } from './logic';
type Page = 'display' | 'rules' | 'events' | 'connection';
type Key = keyof typeof messages.en;
let locale: 'en' | 'ja' = navigator.language.startsWith('ja') ? 'ja' : 'en';
let settings: Settings;
let calendars: { id: string; name: string }[] = [];
let events: CalendarEvent[] = [];
let timeZone = 'Etc/UTC';
let cards: RuleCards = { nextId: 0, cards: [] };
let page: Page = 'display';
let saveBusy = false;
let connection: Connection = { connection: 'not_connected' };
const root = document.querySelector<HTMLDivElement>('#app')!;
const t = (k: Key) => messages[locale][k];
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
function call<T>(name: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject) as unknown as Record<
      string,
      (...v: unknown[]) => void
    >;
    runner[name](...args);
  });
}
function field(key: Key, value: unknown, type = 'text', attrs = '') {
  return `<label class="field">${t(key)}<input data-key="${key}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
}
function switchControl(key: string, label: Key, value: boolean) {
  return `<label class="switch-control ${key === 'enabled' ? 'enable-control' : ''}"><input class="switch" data-key="${key}" type="checkbox" role="switch" ${value ? 'checked' : ''}><span>${t(label)}</span></label>`;
}
function check(key: Key, value: unknown) {
  return switchControl(key, key, Boolean(value));
}
function tableCheck(key: Key, value: unknown) {
  return `<input data-key="${key}" type="checkbox" aria-label="${t(key)}" ${value ? 'checked' : ''}>`;
}
function select(key: Key, value: unknown, choices: readonly string[]) {
  return `<label class="field">${t(key)}<select data-key="${key}">${choices.map((v) => `<option value="${v}" ${v === value ? 'selected' : ''}>${t(v as Key)}</option>`).join('')}</select></label>`;
}
function button(action: string, key: Key, extra = '') {
  return `<button type="button" data-action="${action}" ${extra}>${t(key)}</button>`;
}
function optionFields(o: EventOptions) {
  return `<div class="fields">${check('customText', o.text !== undefined)}${field('text', o.text)}${check('customEmoji', o.emoji !== undefined)}${field('emoji', o.emoji)}${(
    ['pauseNotifications', 'ignore'] as const
  )
    .map(
      (k) =>
        `<label class="field">${t(k)}<select data-key="${k}">${[
          ['', 'inherit'],
          ['true', 'yes'],
          ['false', 'no'],
        ]
          .map(
            ([v, label]) =>
              `<option value="${v}" ${String(o[k] ?? '') === v ? 'selected' : ''}>${t(label as Key)}</option>`,
          )
          .join('')}</select></label>`,
    )
    .join('')}</div>`;
}
function ruleActions(i: number) {
  return `<div class="actions">${button('up', 'up', i === 0 ? 'disabled' : '')}${button('down', 'down', i === settings.rules.length - 1 ? 'disabled' : '')}${button('delete', 'delete')}</div>`;
}
function summaryMarkup(rule: Rule) {
  const summary = ruleSummary(rule, locale);
  return `<span class="rule-summary-line" title="${esc([summary.fullText, ...summary.badges].join(' · '))}"><span>${esc(summary.text)}</span>${summary.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join('')}</span>`;
}
function mobileRule(rule: Rule, i: number) {
  const state = cards.cards[i];
  const summary = ruleSummary(rule, locale);
  return `<details class="rule-card ${rule.enabled ? '' : 'is-disabled'}" data-rule="${i}" data-card="${state.id}" ${state.open ? 'open' : ''}><summary aria-label="${esc([summary.fullText, ...summary.badges].join(' · '))}">${summaryMarkup(rule)}</summary><div class="rule-editor">${check('enabled', rule.enabled)}${field('keyword', rule.keyword)}${select('match', rule.match, ['contains', 'exact'])}${field('text', rule.text)}${field('emoji', rule.emoji)}${check('pauseNotifications', rule.pauseNotifications)}${check('ignore', rule.ignore)}${ruleActions(i)}</div></details>`;
}
function rulesContent() {
  return `<section class="panel"><p class="hint">${t('ruleHint')}</p>${button('add', 'add')}<div class="mobile-rules"><div class="card-controls">${button('expandAll', 'expandAll')}${button('collapseAll', 'collapseAll')}</div>${settings.rules.map(mobileRule).join('')}</div><div class="table-scroll desktop-rules"><table><thead><tr>${(['enabled', 'keyword', 'match', 'text', 'emoji', 'pauseNotifications', 'ignore', 'actions'] as Key[]).map((k) => `<th scope="col">${t(k)}</th>`).join('')}</tr></thead><tbody>${settings.rules.map((r, i) => `<tr class="${r.enabled ? '' : 'is-disabled'}" data-rule="${i}"><td>${tableCheck('enabled', r.enabled)}</td><td>${field('keyword', r.keyword)}</td><td>${select('match', r.match, ['contains', 'exact'])}</td><td>${field('text', r.text)}</td><td>${field('emoji', r.emoji)}</td><td>${tableCheck('pauseNotifications', r.pauseNotifications)}</td><td>${tableCheck('ignore', r.ignore)}</td><td>${ruleActions(i)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function isCustomized(e: CalendarEvent) {
  return settings.overrides.some(
    (o) =>
      o.calendarId === e.calendarId &&
      ('eventId' in o.target
        ? o.target.eventId === e.id
        : o.target.seriesId === e.seriesId),
  );
}
async function refreshEvents() {
  const data = await call<{ events: CalendarEvent[]; timeZone: string }>(
    'listUpcomingEvents',
  );
  events = data.events;
  timeZone = data.timeZone;
}
function content() {
  if (page === 'display')
    return `<section class="panel"><fieldset><legend class="section-title">${t('reflection')}</legend>${(['title', 'fixed', 'none'] as const).map((v) => `<label class="mode"><input type="radio" name="displayMode" value="${v}" ${settings.displayMode === v ? 'checked' : ''}>${t(v)}</label>`).join('')}</fieldset><div class="fields"><div id="custom-status" ${settings.displayMode === 'fixed' ? '' : 'hidden'}>${field('fixedText', settings.fixedText)}</div>${field('emoji', settings.emoji)}</div>${switchControl('pauseNotifications', 'pauseDuring', settings.pauseNotifications)}</section>`;
  if (page === 'rules') return rulesContent();
  if (page === 'events')
    return `<section class="panel"><p class="hint">${t('eventHint')}</p>${events.length ? '' : `<p>${t('empty')}</p>`}${events.map((e, i) => `<article class="event"><p class="hint">${esc(new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(e.start))} – ${esc(new Intl.DateTimeFormat(locale, { timeStyle: 'short', timeZone }).format(e.end))}</p><h2>${esc(e.title)}</h2><details data-event="${i}"><summary>${t('override')}${isCustomized(e) ? `<span class="badge">${t('customized')}</span>` : ''}</summary>${select('scope', 'occurrence', e.seriesId ? ['occurrence', 'series'] : ['occurrence'])}<div class="override-fields"></div>${button('override', 'save')}${button('reset', 'reset')}</details></article>`).join('')}</section>`;
  return `${connectionMarkup(connection, locale)}<section class="panel"><h2>${t('other')}</h2><fieldset><legend>${t('calendars')}</legend>${calendars.map((c) => `<label class="check"><input type="checkbox" data-calendar="${esc(c.id)}" ${settings.calendarIds.includes(c.id) ? 'checked' : ''}>${esc(c.name)}</label>`).join('')}</fieldset>${check('ignoreAllDay', settings.ignoreAllDay)}${check('ignoreFree', settings.ignoreFree)}<p class="hint">${t('declined')}</p><div class="fields">${select('overlap', settings.overlap, ['latestStart', 'ruleOrder'])}${field('beforeMinutes', settings.beforeMinutes, 'number', 'min="0" max="1440" required')}${field('afterMinutes', settings.afterMinutes, 'number', 'min="0" max="1440" required')}</div></section>`;
}
function render() {
  // Native toggle events may be queued; capture the actual state before replacing the DOM.
  root.querySelectorAll<HTMLDetailsElement>('[data-card]').forEach((detail) => {
    cards = updateCards(cards, {
      type: 'toggle',
      id: Number(detail.dataset.card),
      open: detail.open,
    });
  });
  document.documentElement.lang = locale;
  document.title = t('brand');
  root.innerHTML = `<header><div class="topbar"><strong>${t('brand')}</strong><label>${t('language')}<select id="language">${(['en', 'ja'] as const).map((l) => `<option value="${l}" ${locale === l ? 'selected' : ''}>${t(l)}</option>`).join('')}</select></label></div><nav aria-label="${t('brand')}">${(['display', 'rules', 'events', 'connection'] as Page[]).map((p) => `<button type="button" data-page="${p}" ${page === p ? 'aria-current="page"' : ''}>${t(p)}</button>`).join('')}</nav></header><div class="intro"><p class="eyebrow">${t('brand')}</p><h1 tabindex="-1">${t(page)}</h1></div>${reconnectBanner(connection, locale)}<form><main>${content()}</main><div class="savebar"><button class="primary" type="submit" ${saveBusy ? 'disabled' : ''}>${saveBusy ? t('loading') : t('save')}</button></div></form><p id="status" role="status" aria-live="polite"></p>${import.meta.env.PREVIEW ? `<footer>${t('sample')}</footer>` : ''}`;
  root
    .querySelectorAll<HTMLDetailsElement>('[data-event]')
    .forEach((d) => fillOverride(d));
}
function target(d: HTMLElement) {
  const e = events[Number(d.dataset.event)],
    scope = d.querySelector<HTMLSelectElement>('[data-key="scope"]')!.value;
  return {
    calendarId: e.calendarId,
    target:
      scope === 'series' && e.seriesId
        ? { seriesId: e.seriesId }
        : { eventId: e.id },
  };
}
function fillOverride(d: HTMLElement) {
  const id = target(d);
  const o =
    settings.overrides.find(
      (v) =>
        v.calendarId === id.calendarId &&
        JSON.stringify(v.target) === JSON.stringify(id.target),
    ) ?? {};
  d.querySelector('.override-fields')!.innerHTML = optionFields(o);
}
function readOptions(d: HTMLElement): EventOptions {
  const get = (key: string) =>
    (d.querySelector(`[data-key="${key}"]`) as HTMLInputElement).value;
  return {
    ...(d.querySelector<HTMLInputElement>('[data-key="customText"]')!.checked
      ? { text: get('text') }
      : {}),
    ...(d.querySelector<HTMLInputElement>('[data-key="customEmoji"]')!.checked
      ? { emoji: get('emoji') }
      : {}),
    ...Object.fromEntries(
      ['pauseNotifications', 'ignore']
        .filter((k) => get(k) !== '')
        .map((k) => [k, get(k) === 'true']),
    ),
  };
}
function notify(key: Key) {
  document.querySelector('#status')!.textContent = t(key);
}
function editRule(el: HTMLInputElement): boolean {
  const row = el.closest<HTMLElement>('[data-rule]');
  const key = el.dataset.key;
  if (!row || !key) return false;
  const index = Number(row.dataset.rule);
  const value = el.type === 'checkbox' ? el.checked : el.value;
  settings = {
    ...settings,
    rules: settings.rules.map((r, i) =>
      i === index ? { ...r, [key]: value } : r,
    ),
  };
  root
    .querySelectorAll<HTMLElement>(`[data-rule="${index}"]`)
    .forEach((editor) => {
      editor.classList.toggle('is-disabled', !settings.rules[index].enabled);
    });
  // Synchronize the hidden desktop/mobile editor without replacing the active input.
  root
    .querySelectorAll<HTMLInputElement>(
      `[data-rule="${index}"] [data-key="${key}"]`,
    )
    .forEach((input) => {
      if (input === el) return;
      if (input.type === 'checkbox') input.checked = Boolean(value);
      else input.value = String(value);
    });
  const summary = root.querySelector(
    `[data-card][data-rule="${index}"] > summary`,
  );
  if (summary) {
    const next = ruleSummary(settings.rules[index], locale);
    summary.innerHTML = summaryMarkup(settings.rules[index]);
    summary.setAttribute(
      'aria-label',
      [next.fullText, ...next.badges].join(' · '),
    );
  }
  return true;
}
root.addEventListener('input', (event) => {
  editRule(event.target as HTMLInputElement);
});
root.addEventListener(
  'toggle',
  (event) => {
    const detail = event.target as HTMLDetailsElement;
    if (detail.dataset.card !== undefined) {
      cards = updateCards(cards, {
        type: 'toggle',
        id: Number(detail.dataset.card),
        open: detail.open,
      });
    }
  },
  true,
);
root.addEventListener('change', (event) => {
  const el = event.target as HTMLInputElement;
  if (editRule(el)) return;
  if (el.id === 'language') {
    locale = el.value as 'en' | 'ja';
    settings = { ...settings, locale };
    render();
    return;
  }
  const detail = el.closest<HTMLElement>('[data-event]');
  if (detail) {
    if (el.dataset.key === 'scope') fillOverride(detail);
    return;
  }
  const key = el.dataset.key;
  const value =
    el.type === 'checkbox'
      ? el.checked
      : el.type === 'number'
        ? Number(el.value)
        : el.value;
  if (el.dataset.calendar)
    settings = {
      ...settings,
      calendarIds: el.checked
        ? [...settings.calendarIds, el.dataset.calendar]
        : settings.calendarIds.filter((id) => id !== el.dataset.calendar),
    };
  else if (el.name === 'displayMode') {
    settings = {
      ...settings,
      displayMode: el.value as Settings['displayMode'],
    };
    root.querySelector<HTMLElement>('#custom-status')!.hidden =
      settings.displayMode !== 'fixed';
  } else if (key) settings = { ...settings, [key]: value };
});
root.addEventListener('click', async (event) => {
  const b = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!b) return;
  if (b.dataset.page) {
    page = b.dataset.page as Page;
    render();
    root.querySelector<HTMLElement>('h1')!.focus();
    return;
  }
  const action = b.dataset.action;
  if (['connect', 'disconnect', 'checkNow'].includes(action ?? '')) {
    if (action === 'disconnect' && !window.confirm(t('confirmDisconnect')))
      return;
    b.disabled = true;
    try {
      if (action === 'connect')
        window.open(await call<string>('getAuthUrl'), '_top');
      else {
        connection = await call<Connection>(action!);
        render();
      }
    } catch {
      notify('error');
    } finally {
      b.disabled = false;
    }
    return;
  }
  if (!action) return;
  if (action === 'expandAll' || action === 'collapseAll') {
    const open = action === 'expandAll';
    cards = updateCards(cards, { type: 'all', open });
    root
      .querySelectorAll<HTMLDetailsElement>('[data-card]')
      .forEach((detail) => {
        detail.open = open;
      });
    return;
  }
  const row = b.closest<HTMLElement>('[data-rule]'),
    index = Number(row?.dataset.rule);
  const cardId = cards.cards[index]?.id;
  if (action === 'add') cards = updateCards(cards, { type: 'add' });
  if (action === 'delete')
    cards = updateCards(cards, { type: 'delete', index });
  if (action === 'up' || action === 'down')
    cards = updateCards(cards, {
      type: 'move',
      index,
      delta: action === 'up' ? -1 : 1,
    });
  if (action === 'add')
    settings = {
      ...settings,
      rules: [
        ...settings.rules,
        { keyword: '', match: 'contains', enabled: true },
      ],
    };
  if (action === 'delete')
    settings = {
      ...settings,
      rules: settings.rules.filter((_, i) => i !== index),
    };
  if (action === 'up' || action === 'down')
    settings = {
      ...settings,
      rules: reorder(settings.rules, index, action === 'up' ? -1 : 1),
    };
  const detail = b.closest<HTMLElement>('[data-event]');
  if (detail) {
    const id = target(detail);
    settings = {
      ...settings,
      overrides:
        action === 'reset'
          ? settings.overrides.filter(
              (o) =>
                !(
                  o.calendarId === id.calendarId &&
                  JSON.stringify(o.target) === JSON.stringify(id.target)
                ),
            )
          : mergeOverride(settings.overrides, {
              ...id,
              ...readOptions(detail),
            } as EventOverride),
    };
    await save();
    return;
  }
  render();
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  if (action === 'add') {
    root
      .querySelector<HTMLInputElement>(
        `${mobile ? '.mobile-rules' : '.desktop-rules'} [data-rule="${settings.rules.length - 1}"] [data-key="keyword"]`,
      )
      ?.focus();
  } else if (action === 'up' || action === 'down') {
    const nextIndex = cards.cards.findIndex((c) => c.id === cardId);
    const scope = mobile ? '.mobile-rules' : '.desktop-rules';
    const destination = root.querySelector<HTMLElement>(
      `${scope} [data-rule="${nextIndex}"]`,
    );
    const nextButton = destination?.querySelector<HTMLButtonElement>(
      `[data-action="${action}"]`,
    );
    if (nextButton && !nextButton.disabled) nextButton.focus();
    else
      destination
        ?.querySelector<HTMLElement>(
          mobile ? 'summary' : '[data-key="keyword"]',
        )
        ?.focus();
  } else if (action === 'delete') {
    const scope = mobile ? '.mobile-rules' : '.desktop-rules';
    const nextIndex = Math.min(index, settings.rules.length - 1);
    const focus = root.querySelector<HTMLElement>(
      `${scope} [data-rule="${nextIndex}"] ${mobile ? 'summary' : '[data-key="keyword"]'}`,
    );
    (focus ?? root.querySelector<HTMLElement>('[data-action="add"]'))?.focus();
  }
});
async function save() {
  if (saveBusy) return;
  saveBusy = true;
  root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled =
    true;
  try {
    settings = await call<Settings>('saveSettings', settings);
    await refreshEvents();
    render();
    notify('saved');
  } catch {
    notify('error');
  } finally {
    saveBusy = false;
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled =
      false;
  }
}
root.addEventListener('submit', (e) => {
  e.preventDefault();
  void save();
});
async function start() {
  root.textContent = t('loading');
  try {
    const data = await call<{
      settings: Settings;
      calendars: typeof calendars;
    }>('getSettings', locale);
    settings = data.settings;
    cards = updateCards(cards, { type: 'load', count: settings.rules.length });
    locale = settings.locale;
    calendars = data.calendars;
    connection = await call<Connection>('getConnection');
    await refreshEvents();
    render();
  } catch {
    root.textContent = t('error');
    const retry = document.createElement('button');
    retry.textContent = t('loading');
    retry.onclick = () => void start();
    root.append(retry);
  }
}
void start();

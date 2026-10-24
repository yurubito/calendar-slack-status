import { expect, it } from 'vitest';
import source from './app.ts?raw';

it('starts Display mode directly with its only settings card and keeps the save bar', () => {
  const display = source.slice(
    source.indexOf("if (page === 'display')"),
    source.indexOf("if (page === 'rules')"),
  );
  expect(display).toContain('<section class="panel"><fieldset>');
  expect(display.match(/<section\b/g)).toHaveLength(1);
  expect(display).toContain("t('reflection')");
  expect(display).toContain("['title', 'fixed', 'none']");
  expect(display).toContain("field('fixedText'");
  expect(display).toContain("field('emoji'");
  expect(display).toContain("'pauseDuring'");
  expect(display).not.toContain('<select');
  expect(display).not.toContain('settings.automatic');
  expect(source).toContain('class="savebar"');
});

it('keeps both connection actions disabled until Phase 3', () => {
  expect(source).toContain("button('connect', 'connect', 'disabled')");
  expect(source).toContain("button('disconnect', 'disconnect', 'disabled')");
});

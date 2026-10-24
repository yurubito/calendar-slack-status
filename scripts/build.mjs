import { build } from 'esbuild';
import { readFile, mkdir, writeFile, copyFile } from 'node:fs/promises';
const preview = process.argv.includes('--preview');
const out = preview ? 'preview' : 'dist';
await mkdir(out, { recursive: true });
const result = await build({
  stdin: preview
    ? {
        contents: "import './src/ui/mock'; import './src/ui/app';",
        resolveDir: process.cwd(),
        loader: 'ts',
      }
    : undefined,
  entryPoints: preview ? undefined : ['src/ui/app.ts'],
  bundle: true,
  write: false,
  format: 'iife',
  target: 'es2020',
  define: { 'import.meta.env.PREVIEW': String(preview) },
});
const template = await readFile('src/ui/index.html', 'utf8');
await writeFile(
  `${out}/${preview ? 'index' : 'Index'}.html`,
  template
    .replace('/* STYLES */', await readFile('src/ui/styles.css', 'utf8'))
    .replace('/* SCRIPT */', () =>
      result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'),
    ),
);
if (!preview) {
  await build({
    entryPoints: ['src/server.ts'],
    bundle: true,
    outfile: 'dist/Code.js',
    format: 'iife',
    globalName: 'Server',
    target: 'es2020',
    footer: {
      js: 'function doGet(){return Server.doGet();}\nfunction getSettings(locale){return Server.getSettings(locale);}\nfunction saveSettings(value){return Server.saveSettings(value);}\nfunction listUpcomingEvents(){return Server.listUpcomingEvents();}',
    },
  });
  await copyFile('src/appsscript.json', 'dist/appsscript.json');
}
console.log(`Built ${out}/`);

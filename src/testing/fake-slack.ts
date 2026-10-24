import { fork, spawnSync } from 'node:child_process';
import type { Fetch } from '../adapters/slack';
export const TOKEN = 'fixture-user-credential',
  SECRET = 'fixture-client-credential';
export interface Recorded {
  method: string;
  url: string;
  headers: Record<string, string>;
  fields: Record<string, string>;
}
export async function fakeSlack() {
  const child = fork(new URL('./fake-slack-server.mjs', import.meta.url), [], {
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  const port = await new Promise<number>((resolve) =>
    child.once('message', (m) => resolve((m as { port: number }).port)),
  );
  const fetch: Fetch = (url, fields, token) => {
    const method = url.split('/').pop();
    const script = `const http=require('node:http'); const p=JSON.parse(process.argv[1]); const r=http.request(p.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...(p.token?{Authorization:'Bearer '+p.token}:{})}},r=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.stdout.write(JSON.stringify({status:r.statusCode,body:b,retryAfter:r.headers['retry-after']})))});r.on('error',()=>process.exit(2));r.setTimeout(200,()=>r.destroy());r.end(new URLSearchParams(p.fields).toString());`;
    const r = spawnSync(
      process.execPath,
      [
        '-e',
        script,
        JSON.stringify({
          url: `http://127.0.0.1:${port}/${method}`,
          fields,
          token,
        }),
      ],
      { encoding: 'utf8', timeout: 2000 },
    );
    if (r.status !== 0) throw new Error('transport');
    return JSON.parse(r.stdout);
  };
  const control = (data: unknown = {}) =>
    JSON.parse(
      fetch('http://local/_control', { data: JSON.stringify(data) }).body,
    ) as { requests: Recorded[] };
  return {
    fetch,
    control,
    close: () => child.kill(),
    get requests() {
      return control().requests;
    },
  };
}

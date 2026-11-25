import { request } from 'node:http';
/** fetch Host sarlavhasini o‘zgartirishga ruxsat bermaydi — shuning uchun node:http. */
export const http = (port, method, path, body, headers = {}) => new Promise((ok, no) => {
  const data = body ? JSON.stringify(body) : null;
  const r = request({ host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json', ...(data ? { 'content-length': Buffer.byteLength(data) } : {}), ...headers } }, res => {
    const ch = []; res.on('data', c => ch.push(c));
    res.on('end', () => { let j = {}; try { j = JSON.parse(Buffer.concat(ch).toString()); } catch { /* ignore */ } ok({ s: res.statusCode, j }); });
  });
  r.on('error', no); if (data) r.write(data); r.end();
});

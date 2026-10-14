import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
/** Hash final inline code, after Vite's HTML transformations. Pages cannot set headers. */
export function cspPlugin(): Plugin {
  return {
    name: 'm8e-csp', apply: 'build', enforce: 'post',
    transformIndexHtml: { order: 'post', handler(html) {
      const hashes = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
        .map((match) => `'sha256-${createHash('sha256').update(match[1] ?? '').digest('base64')}'`);
      // Runtime styles are required by CodeMirror, React Aria and motion. Scripts never allow inline/eval.
      const policy = ["default-src 'none'", `script-src 'self' ${hashes.join(' ')}`,
        "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:", "font-src 'self'",
        "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'", "base-uri 'none'",
        "object-src 'none'", "form-action 'none'"].join('; ');
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n<meta http-equiv="Content-Security-Policy" content="${policy}" />`);
    } },
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';

// Puppeteer 14's transpiled CommonJS loader unwraps the ESM default export.
const loaded = createRequire(import.meta.url)('extract-zip');
const extract = loaded.__esModule ? loaded.default : loaded;
const fixtures = {
  normal: 'UEsDBBQAAAAAAEidXV2GphA2BQAAAAUAAAAPAAAAZm9sZGVyL2ZpbGUudHh0aGVsbG9QSwECFAMUAAAAAABInV1dhqYQNgUAAAAFAAAADwAAAAAAAAAAAAAAgAEAAAAAZm9sZGVyL2ZpbGUudHh0UEsFBgAAAAABAAEAPQAAADIAAAAAAA==',
  traversal: 'UEsDBBQAAAAAAEidXV0fKKpnAgAAAAIAAAAWAAAALi4vb3V0c2lkZS9lc2NhcGVkLnR4dG5vUEsBAhQDFAAAAAAASJ1dXR8oqmcCAAAAAgAAABYAAAAAAAAAAAAAAIABAAAAAC4uL291dHNpZGUvZXNjYXBlZC50eHRQSwUGAAAAAAEAAQBEAAAANgAAAAAA',
  symlink: 'UEsDBBQAAAAAAAAAIQAGUP3wCgAAAAoAAAAGAAAAZXNjYXBlLi4vb3V0c2lkZVBLAwQUAAAAAABInV1dHyiqZwIAAAACAAAAEgAAAGVzY2FwZS9lc2NhcGVkLnR4dG5vUEsBAhQDFAAAAAAAAAAhAAZQ/fAKAAAACgAAAAYAAAAAAAAAAAAAAP+hAAAAAGVzY2FwZVBLAQIUAxQAAAAAAEidXV0fKKpnAgAAAAIAAAASAAAAAAAAAAAAAACAAS4AAABlc2NhcGUvZXNjYXBlZC50eHRQSwUGAAAAAAIAAgB0AAAAYAAAAAAA',
};

test('extracts normal ZIPs and rejects traversal and symlink escapes', async t => {
  assert.equal(typeof extract,'function');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'extract-check-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const [name,bytes] of Object.entries(fixtures)) fs.writeFileSync(path.join(root,`${name}.zip`),Buffer.from(bytes,'base64'));
  const valid=path.join(root,'valid');fs.mkdirSync(valid);await extract(path.join(root,'normal.zip'),{dir:valid});assert.equal(fs.readFileSync(path.join(valid,'folder','file.txt'),'utf8'),'hello');
  for(const name of ['traversal','symlink']) { const dir=path.join(root,name);fs.mkdirSync(dir);await assert.rejects(extract(path.join(root,`${name}.zip`),{dir})); }
  assert.equal(fs.existsSync(path.join(root,'outside','escaped.txt')),false);
});

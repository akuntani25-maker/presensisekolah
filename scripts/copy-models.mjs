// Menyalin model face-api dari node_modules ke public/models (dijalankan otomatis setelah npm install)
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const src = join('node_modules', '@vladmandic', 'face-api', 'model');
const dest = join('public', 'models');
const wanted = ['tiny_face_detector_model', 'face_landmark_68_model', 'face_recognition_model'];

if (!existsSync(src)) {
  console.warn('[copy-models] folder model face-api tidak ditemukan, dilewati');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (wanted.some((w) => f.startsWith(w))) {
    cpSync(join(src, f), join(dest, f));
    n++;
  }
}
console.log(`[copy-models] ${n} file model disalin ke public/models`);

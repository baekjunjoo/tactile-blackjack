/* fetch-assets.mjs — 빌드에 필요한 외부 자산을 public/ 로 다운로드 (자체 호스팅)
   1) 힙스필드 이미지 16종 → public/img/
   2) 게임 썸네일 → public/img/thumbnail.png
   3) DotPad 공식 SDK → public/DotPadSDK-3.0.0.js
   실행: node scripts/fetch-assets.mjs (npm run build 의 prebuild 단계에서 자동 실행) */
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3CcWiPncoAiF9dchSMyN7go3kbf/';
const IMAGES = {
  'hero.webp': 'hf_20260720_014955_37f909cb-6a00-44f6-9938-b858dc6e93bf_min.webp',
  'tile-chips.webp': 'hf_20260720_014958_88f347de-da69-4eea-b7c1-cf1e9bbe3a50_min.webp',
  'tile-cards.webp': 'hf_20260720_014959_15a0f02e-ee95-4202-8bab-b355270891d3_min.webp',
  'tile-trophy.webp': 'hf_20260720_015001_b64eadc8-3192-4f00-8a56-98f3224cf49a_min.webp',
  'tile-dotpad.webp': 'hf_20260720_023103_f4ed9987-8cd2-4173-8427-988eb42bcce3_min.webp',
  'cardback.webp': 'hf_20260720_043553_59e0d734-1e89-4269-9558-8b7ce7906547_min.webp',
  'tablefelt.webp': 'hf_20260720_045609_d29accea-91cd-42ba-9792-9c08af91f4a0_min.webp',
  'av-dealer.webp': 'hf_20260720_043552_5d3ffcef-9c3f-4766-9606-d275fb4a0429_min.webp',
  'av-bear.webp': 'hf_20260720_043229_e8213d32-437d-4c74-b153-d0a13afd6705_min.webp',
  'av-rabbit.webp': 'hf_20260720_043231_80858034-fbf9-40f6-8e94-954bd4e7e45a_min.webp',
  'av-tiger.webp': 'hf_20260720_043232_4670fc09-678a-4707-947f-269076d6dbd0_min.webp',
  'av-fox.webp': 'hf_20260720_043234_74ad7845-496d-4e32-a1e0-214dc66e21e7_min.webp',
  'av-cat.webp': 'hf_20260720_043235_9912acb5-233a-4436-8b67-a7e3b792a830_min.webp',
  'av-dog.webp': 'hf_20260720_043245_630bb4a7-dc04-4300-9cb2-20e142b5e288_min.webp',
  'av-panda.webp': 'hf_20260720_043246_e4a0066a-1de8-4f9c-9c25-210ef110c51a_min.webp',
  'av-owl.webp': 'hf_20260720_043248_11eb203c-b388-4eb1-9898-19520bbf262c_min.webp'
};

// 게임 썸네일 (풀 해상도 PNG)
const THUMB = 'hf_20260722_071209_572cf63b-46a2-498a-b3d9-047e0f554913.png';

// DotPad 공식 SDK (원본: baekjunjoo/superdot 루트)
const SDK_URL = 'https://raw.githubusercontent.com/baekjunjoo/superdot/main/DotPadSDK-3.0.0.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imgDir = join(root, 'public', 'img');
mkdirSync(imgDir, { recursive: true });

let ok = 0, fail = 0;
for (const [name, file] of Object.entries(IMAGES)) {
  try {
    const res = await fetch(CDN + file);
    if (!res.ok) { console.error('이미지 실패:', name, res.status); fail++; continue; }
    writeFileSync(join(imgDir, name), Buffer.from(await res.arrayBuffer()));
    ok++;
  } catch (e) { console.error('이미지 오류:', name, e.message); fail++; }
}
console.log(`이미지 ${ok} 성공 / ${fail} 실패 → public/img/`);

try {
  const res = await fetch(CDN + THUMB);
  if (res.ok) {
    writeFileSync(join(imgDir, 'thumbnail.png'), Buffer.from(await res.arrayBuffer()));
    console.log('썸네일 저장 → public/img/thumbnail.png');
  } else console.error('썸네일 실패:', res.status);
} catch (e) { console.error('썸네일 오류:', e.message); }

try {
  const res = await fetch(SDK_URL);
  if (res.ok) {
    writeFileSync(join(root, 'public', 'DotPadSDK-3.0.0.js'), Buffer.from(await res.arrayBuffer()));
    console.log('DotPad SDK 저장 → public/DotPadSDK-3.0.0.js');
  } else console.error('SDK 실패:', res.status);
} catch (e) { console.error('SDK 오류:', e.message); }

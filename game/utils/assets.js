import { ASSETS } from '../config/constants.js';

/** One request per image per page load, shared by every scene that asks (key → loaded Image, or null on error) */
const requests = new Map();
/** Keys whose request has finished (loaded or failed) */
const settled = new Set();

/** True once every key's request has finished — successfully or not. */
export function areImagesSettled(keys) {
  return keys.every((key) => settled.has(key));
}

/** Resolves when every key's request has finished (call loadOptionalImages first). */
export function whenImagesSettled(keys) {
  return Promise.all(keys.map((key) => requests.get(key)));
}

/**
 * Load optional background images without blocking scene boot (cst_logo is preloaded synchronously
 * in BootScene instead). Safe to call from any scene: each file is only fetched once, and the small
 * Silver Jubilee stage images are requested before the larger campus photos.
 */
export function loadOptionalImages(scene) {
  const optional = [
    ['classic_bg', ASSETS.classic],
    ...ASSETS.story.map((path, i) => [`story${i + 1}`, path]),
    ...ASSETS.campus.map((path, i) => [`campus${i + 1}`, path]),
  ];

  optional.forEach(([key, path]) => {
    if (!requests.has(key)) {
      requests.set(key, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = path;
      }).then((img) => {
        settled.add(key);
        return img;
      }));
    }
    requests.get(key).then((img) => {
      if (img && scene?.textures && !scene.textures.exists(key)) {
        scene.textures.addImage(key, img);
      }
    });
  });
}

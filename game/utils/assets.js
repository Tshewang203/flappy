import { ASSETS } from '../config/constants.js';

/** Load optional PNG assets without blocking scene boot */
export function loadOptionalImages(scene) {
  const optional = [
    ['cst_logo', ASSETS.logo],
    ...ASSETS.campus.map((path, i) => [`campus${i + 1}`, path]),
  ];

  optional.forEach(([key, path]) => {
    const img = new Image();
    img.onload = () => {
      if (scene?.textures && !scene.textures.exists(key)) {
        scene.textures.addImage(key, img);
      }
    };
    img.onerror = () => {};
    img.src = path;
  });
}

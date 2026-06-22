/**
 * Avatar capture utilities — camera, upload, and preview.
 * Images stored in localStorage only (never Firebase).
 */

import { saveAvatar, removeAvatar, resizeImageToBase64 } from './storage.js';

let activeStream = null;

/** Wait until the video element has valid frame dimensions */
function waitForVideoReady(video, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      video.removeEventListener('loadeddata', onReady);
      reject(new Error('Camera not ready'));
    }, timeoutMs);

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', onReady);
        resolve();
      }
    };

    video.addEventListener('loadeddata', onReady);
  });
}

/** Draw captured video frame onto canvas (center-cropped square) */
function captureVideoFrame(video, canvas) {
  const size = 320;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const srcSize = Math.min(video.videoWidth, video.videoHeight);
  const sx = (video.videoWidth - srcSize) / 2;
  const sy = (video.videoHeight - srcSize) / 2;
  ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, size, size);
  return canvas.toDataURL('image/png');
}

/**
 * Build a circular face texture from a captured/uploaded avatar.
 * @param {Phaser.Scene} scene
 * @param {string} avatarBase64
 * @param {string} textureKey
 * @returns {Promise<string>} resolved texture key
 */
export function buildFaceTexture(scene, avatarBase64, textureKey = 'player_face') {
  return new Promise((resolve, reject) => {
    const faceImg = new Image();

    faceImg.onload = () => {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(faceImg, 0, 0, size, size);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();

      if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
      scene.textures.addCanvas(textureKey, canvas);
      resolve(textureKey);
    };

    faceImg.onerror = () => reject(new Error('Failed to load avatar image'));
    faceImg.src = avatarBase64;
  });
}

/** Stop any active camera stream */
export function stopCamera() {
  if (activeStream) {
    activeStream.getTracks().forEach((t) => t.stop());
    activeStream = null;
  }
}

/**
 * Open camera capture overlay.
 * @returns {Promise<string|null>} base64 image or null if cancelled
 */
export function openCameraCapture() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'avatar-overlay';
    overlay.innerHTML = `
      <div class="avatar-modal">
        <p class="avatar-modal-title">📸 Take Your Photo</p>
        <video class="avatar-video" autoplay playsinline muted></video>
        <canvas class="avatar-canvas" style="display:none"></canvas>
        <img class="avatar-preview" style="display:none" alt="Preview" />
        <p class="avatar-error" style="display:none"></p>
        <div class="avatar-actions">
          <button class="avatar-btn capture-btn">Capture</button>
          <button class="avatar-btn confirm-btn" style="display:none">Use Photo</button>
          <button class="avatar-btn retake-btn" style="display:none">Retake</button>
          <button class="avatar-btn cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const video = overlay.querySelector('.avatar-video');
    const canvas = overlay.querySelector('.avatar-canvas');
    const preview = overlay.querySelector('.avatar-preview');
    const errorEl = overlay.querySelector('.avatar-error');
    const captureBtn = overlay.querySelector('.capture-btn');
    const confirmBtn = overlay.querySelector('.confirm-btn');
    const retakeBtn = overlay.querySelector('.retake-btn');
    const cancelBtn = overlay.querySelector('.cancel-btn');

    let capturedData = null;

    const cleanup = (result) => {
      stopCamera();
      overlay.remove();
      resolve(result);
    };

    cancelBtn.onclick = () => cleanup(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      errorEl.textContent = 'Camera not supported. Try Upload Image instead.';
      errorEl.style.display = 'block';
      captureBtn.style.display = 'none';
    } else {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 } })
        .then((stream) => {
          activeStream = stream;
          video.srcObject = stream;
        })
        .catch(() => {
          errorEl.textContent = 'Camera permission denied. Try Upload Image instead.';
          errorEl.style.display = 'block';
          captureBtn.style.display = 'none';
        });
    }

    captureBtn.onclick = async () => {
      errorEl.style.display = 'none';
      captureBtn.disabled = true;

      try {
        await waitForVideoReady(video);
      } catch {
        errorEl.textContent = 'Camera not ready yet. Please wait a moment and try again.';
        errorEl.style.display = 'block';
        captureBtn.disabled = false;
        return;
      }

      capturedData = captureVideoFrame(video, canvas);

      video.style.display = 'none';
      preview.src = capturedData;
      preview.style.display = 'block';
      preview.onload = () => {
        preview.style.opacity = '1';
      };
      captureBtn.style.display = 'none';
      captureBtn.disabled = false;
      confirmBtn.style.display = 'inline-block';
      retakeBtn.style.display = 'inline-block';
      stopCamera();
    };

    retakeBtn.onclick = () => {
      preview.style.display = 'none';
      video.style.display = 'block';
      captureBtn.style.display = 'inline-block';
      confirmBtn.style.display = 'none';
      retakeBtn.style.display = 'none';
      capturedData = null;

      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'user' } })
        .then((stream) => {
          activeStream = stream;
          video.srcObject = stream;
        })
        .catch(() => cleanup(null));
    };

    confirmBtn.onclick = async () => {
      if (!capturedData) return cleanup(null);
      try {
        const resized = await resizeImageToBase64(capturedData);
        saveAvatar(resized);
        cleanup(resized);
      } catch {
        cleanup(null);
      }
    };
  });
}

/**
 * Open file picker for image upload.
 * @returns {Promise<string|null>}
 */
export function openImageUpload() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resized = await resizeImageToBase64(reader.result);
          saveAvatar(resized);
          resolve(resized);
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.click();
  });
}

/** Remove avatar from storage */
export function clearAvatar() {
  removeAvatar();
}

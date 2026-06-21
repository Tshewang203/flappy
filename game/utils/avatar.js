/**
 * Avatar capture utilities — camera, upload, and preview.
 * Images stored in localStorage only (never Firebase).
 */

import { saveAvatar, removeAvatar, resizeImageToBase64 } from './storage.js';

let activeStream = null;

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

    captureBtn.onclick = () => {
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);
      capturedData = canvas.toDataURL('image/png');

      video.style.display = 'none';
      preview.src = capturedData;
      preview.style.display = 'block';
      captureBtn.style.display = 'none';
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

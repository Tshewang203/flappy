/**
 * Avatar capture utilities — camera, upload, and preview.
 * Images stored in localStorage only (never Firebase).
 */

import { saveAvatar, removeAvatar, resizeImageToBase64 } from './storage.js';

let activeStream = null;

function getUserMediaFn() {
  if (navigator.mediaDevices?.getUserMedia) {
    return (constraints) => navigator.mediaDevices.getUserMedia(constraints);
  }
  const legacy = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
  if (!legacy) return null;
  return (constraints) => new Promise((resolve, reject) => {
    legacy.call(navigator, constraints, resolve, reject);
  });
}

function isVideoReady(video) {
  return !!video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
}

function waitForVideoReady(video, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (isVideoReady(video)) {
      resolve();
      return;
    }

    let settled = false;
    const finish = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      video.removeEventListener('loadedmetadata', onReady);
      video.removeEventListener('loadeddata', onReady);
      video.removeEventListener('canplay', onReady);
      video.removeEventListener('playing', onReady);
      if (err) reject(err);
      else resolve();
    };

    const onReady = () => {
      if (isVideoReady(video)) finish();
    };

    const timer = setTimeout(() => finish(new Error('Camera not ready')), timeoutMs);
    let raf = 0;
    const poll = () => {
      if (settled) return;
      if (isVideoReady(video)) {
        finish();
        return;
      }
      raf = requestAnimationFrame(poll);
    };

    video.addEventListener('loadedmetadata', onReady);
    video.addEventListener('loadeddata', onReady);
    video.addEventListener('canplay', onReady);
    video.addEventListener('playing', onReady);
    poll();
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * Draw a square crop of the live frame, mirrored horizontally so the saved photo
 * matches the selfie-style (mirror) preview the player saw.
 */
function captureVideoFrame(video, canvas) {
  const size = 320;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const srcSize = Math.min(vw, vh);
  const sx = (vw - srcSize) / 2;
  const sy = (vh - srcSize) / 2;
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, sx, sy, srcSize, srcSize, 0, 0, size, size);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const data = canvas.toDataURL('image/png');
  if (!data || data === 'data:,' || data.length < 100) return null;
  return data;
}

/** Live camera preview behaves like a mirror (as phone selfie cameras do). */
function applyMirror(el) {
  el.style.transform = 'scaleX(-1)';
  el.style.webkitTransform = 'scaleX(-1)';
  el.style.scale = 'none';
}

/** Captured photo is already mirrored in pixels, so show it as-is. */
function applyTrueOrientation(el) {
  el.style.transform = 'none';
  el.style.webkitTransform = 'none';
  el.style.scale = 'none';
}

/** Live camera (getUserMedia) only works on https:// pages or localhost. */
function canUseLiveCamera() {
  return window.isSecureContext && !!getUserMediaFn();
}

function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** The capture flow currently open, so repeated taps don't stack modals/streams. */
let pendingCapture = null;

/**
 * Pick an image with a native file input. With capture set, phones open their camera
 * app directly — this works on plain http:// too (e.g. the game opened over Wi-Fi).
 * @param {{ capture?: 'user' | 'environment' }} [opts]
 * @returns {Promise<string|null>} resized base64 avatar, saved to storage
 */
function pickImageFile({ capture } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocusBack);
      input.remove();
      resolve(result);
    };

    // Dismissing the picker fires "cancel" in modern browsers. Older ones only give the
    // window focus back, so wait a while for a late "change" before treating it as cancel.
    input.addEventListener('cancel', () => finish(null));
    const onFocusBack = () => {
      setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 3000);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resized = await resizeImageToBase64(reader.result);
          saveAvatar(resized);
          finish(resized);
        } catch {
          finish(null);
        }
      };
      reader.onerror = () => finish(null);
      reader.readAsDataURL(file);
    };

    window.addEventListener('focus', onFocusBack);
    input.click();
  });
}

function prepareVideoElement(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.controls = false;
  video.loop = false;
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
  video.setAttribute('autoplay', '');
  applyMirror(video);
}

async function attachCameraStream(video) {
  stopCamera();
  prepareVideoElement(video);

  const getUserMedia = getUserMediaFn();
  if (!getUserMedia) {
    throw new Error('Camera not supported');
  }

  const attempts = [
    { audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } },
    { audio: false, video: { facingMode: 'user' } },
    { audio: false, video: true },
  ];

  let lastError = null;
  for (const constraints of attempts) {
    try {
      const stream = await getUserMedia(constraints);
      activeStream = stream;
      video.srcObject = stream;
      video.muted = true;
      applyMirror(video);
      try {
        await video.play();
      } catch {
        // Autoplay can reject even when muted; frames may still arrive.
      }
      await waitForVideoReady(video);
      await nextFrame();
      return stream;
    } catch (err) {
      lastError = err;
      stopCamera();
      video.srcObject = null;
    }
  }

  throw lastError || new Error('Camera unavailable');
}

function cameraErrorMessage(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission denied. Allow camera access or use Upload Image.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found. Try Upload Image instead.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is in use by another app. Close it and try again.';
  }
  if (name === 'SecurityError' || !window.isSecureContext) {
    return 'Camera needs a secure page (https or localhost). Try Upload Image instead.';
  }
  return 'Could not open camera. Try Upload Image instead.';
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
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      const c = size / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(c, c, c - 1, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(faceImg, 0, 0, size, size);
      ctx.restore();

      // Gold ring with a dark outline so the face reads clearly over any background
      const ring = ctx.createLinearGradient(0, 0, size, size);
      ring.addColorStop(0, '#fff6c2');
      ring.addColorStop(0.45, '#ffd23f');
      ring.addColorStop(1, '#c98a00');
      ctx.strokeStyle = ring;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(c, c, c - 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(40, 25, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c, c, c - 1.5, 0, Math.PI * 2);
      ctx.stroke();
      // Glossy highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(c - size * 0.16, c - size * 0.26, size * 0.2, size * 0.09, -0.5, 0, Math.PI * 2);
      ctx.fill();

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
  // Only one capture flow at a time — a second tap reuses the open one.
  if (pendingCapture) return pendingCapture;

  // Secure-context rule: browsers expose navigator.mediaDevices.getUserMedia only on
  // https:// pages and on localhost. A LAN address like http://192.168.x.x:3000 is
  // "Not Secure", so the live camera cannot work there, whatever the code does.
  // On phones, <input type="file" capture> still opens the camera app over http,
  // so use that. This must run synchronously so the tap still counts as a user gesture.
  if (!window.isSecureContext && isTouchDevice()) {
    pendingCapture = pickImageFile({ capture: 'user' }).finally(() => { pendingCapture = null; });
    return pendingCapture;
  }

  pendingCapture = openCameraModal().finally(() => { pendingCapture = null; });
  return pendingCapture;
}

function openCameraModal() {
  return new Promise((resolve) => {
    document.body.classList.add('avatar-capture-open');

    const overlay = document.createElement('div');
    overlay.className = 'avatar-overlay';
    overlay.innerHTML = `
      <div class="avatar-modal">
        <p class="avatar-modal-title"><svg class="avatar-modal-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-2.5h5L16 7"/><circle cx="12" cy="13.5" r="3.5"/></svg> Take Your Photo</p>
        <video class="avatar-video" autoplay playsinline muted></video>
        <canvas class="avatar-canvas" style="display:none"></canvas>
        <img class="avatar-preview" alt="Preview" />
        <p class="avatar-error" style="display:none"></p>
        <div class="avatar-actions">
          <button type="button" class="avatar-btn capture-btn" disabled>Starting camera…</button>
          <button type="button" class="avatar-btn confirm-btn" style="display:none">Use Photo</button>
          <button type="button" class="avatar-btn retake-btn" style="display:none">Retake</button>
          <button type="button" class="avatar-btn native-btn" style="display:none">Use Phone Camera</button>
          <button type="button" class="avatar-btn cancel-btn">Cancel</button>
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
    const nativeBtn = overlay.querySelector('.native-btn');

    preview.style.display = 'none';
    applyTrueOrientation(preview);

    let capturedData = null;
    let closed = false;

    const showError = (message) => {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    };

    const cleanup = (result) => {
      if (closed) return;
      closed = true;
      stopCamera();
      document.body.classList.remove('avatar-capture-open');
      overlay.remove();
      resolve(result);
    };

    // Keep taps inside the modal from reaching Phaser's window-level listeners.
    // These MUST be bubble-phase listeners: stopping propagation in the capture phase
    // on this ancestor would stop the event before it reaches the modal's own buttons,
    // leaving Capture / Use Photo / Cancel dead and the game stuck behind the modal.
    const blockGameInput = (event) => {
      event.stopPropagation();
    };

    ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click'].forEach((type) => {
      overlay.addEventListener(type, blockGameInput);
    });
    ['touchstart', 'touchend', 'wheel'].forEach((type) => {
      overlay.addEventListener(type, blockGameInput, { passive: true });
    });

    cancelBtn.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      cleanup(null);
    };

    // Fallback when the live camera is unavailable: phone camera app / file picker
    nativeBtn.textContent = isTouchDevice() ? 'Use Phone Camera' : 'Choose Photo';
    nativeBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      stopCamera();
      const result = await pickImageFile({ capture: 'user' });
      if (result) cleanup(result);
    };

    const startPreview = async () => {
      captureBtn.disabled = true;
      captureBtn.style.display = 'inline-block';
      captureBtn.textContent = 'Starting camera…';
      errorEl.style.display = 'none';
      preview.style.display = 'none';
      video.style.display = 'block';
      prepareVideoElement(video);

      if (!canUseLiveCamera()) {
        showError(window.isSecureContext
          ? 'This browser does not support the camera. Choose a photo instead.'
          : `The camera is blocked on http://${location.host} because the page is not secure. `
            + 'Browsers only allow the camera on https:// or localhost. '
            + 'Open the game via localhost or the HTTPS dev server, or choose a photo instead.');
        captureBtn.style.display = 'none';
        video.style.display = 'none';
        nativeBtn.style.display = 'inline-block';
        return;
      }

      try {
        await attachCameraStream(video);
        if (closed) {
          // Modal was cancelled while the camera was starting — don't leave it on.
          stopCamera();
          return;
        }
        applyMirror(video);
        captureBtn.disabled = false;
        captureBtn.textContent = 'Capture';
      } catch (err) {
        if (closed) return;
        showError(cameraErrorMessage(err));
        captureBtn.style.display = 'none';
        nativeBtn.style.display = 'inline-block';
      }
    };

    captureBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      errorEl.style.display = 'none';
      captureBtn.disabled = true;

      try {
        await waitForVideoReady(video, 5000);
        await nextFrame();
      } catch {
        showError('Camera not ready yet. Please wait a moment and try again.');
        captureBtn.disabled = false;
        return;
      }

      capturedData = captureVideoFrame(video, canvas);
      if (!capturedData) {
        showError('Could not capture a frame. Try again.');
        captureBtn.disabled = false;
        return;
      }

      video.style.display = 'none';
      preview.src = capturedData;
      preview.style.display = 'block';
      applyTrueOrientation(preview);
      captureBtn.style.display = 'none';
      captureBtn.disabled = false;
      confirmBtn.style.display = 'inline-block';
      retakeBtn.style.display = 'inline-block';
      stopCamera();
    };

    retakeBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      preview.style.display = 'none';
      preview.removeAttribute('src');
      video.style.display = 'block';
      captureBtn.style.display = 'inline-block';
      confirmBtn.style.display = 'none';
      retakeBtn.style.display = 'none';
      capturedData = null;
      await startPreview();
    };

    confirmBtn.onclick = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!capturedData) return cleanup(null);
      try {
        const resized = await resizeImageToBase64(capturedData);
        saveAvatar(resized);
        cleanup(resized);
      } catch {
        cleanup(null);
      }
    };

    startPreview();
  });
}

/**
 * Open file picker for image upload.
 * @returns {Promise<string|null>}
 */
export function openImageUpload() {
  return pickImageFile();
}

/** Remove avatar from storage */
export function clearAvatar() {
  removeAvatar();
}

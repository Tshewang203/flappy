import { isMusicEnabled, isSfxEnabled } from './storage.js';
import { AUDIO_FILES } from '../config/constants.js';

/**
 * Full sound design system — MP3 files when present, procedural Web Audio fallbacks.
 */
export class AudioManager {
  static ctx = null;
  static loaded = false;
  static loading = false;
  static currentBgmKey = null;
  static bgmNodes = null;
  static intenseBgmActive = false;

  /** Preload optional MP3 files in BootScene (skips missing files gracefully) */
  static preload(scene, onComplete) {
    if (AudioManager.loaded) {
      onComplete?.();
      return;
    }
    if (AudioManager.loading) {
      scene.time.delayedCall(100, () => AudioManager.preload(scene, onComplete));
      return;
    }

    const entries = Object.entries(AUDIO_FILES);
    if (!entries.length || !scene?.load) {
      AudioManager.loaded = true;
      onComplete?.();
      return;
    }

    AudioManager.loading = true;
    let finished = false;
    let added = 0;

    const finish = () => {
      if (finished) return;
      finished = true;
      AudioManager.loading = false;
      AudioManager.loaded = true;
      onComplete?.();
    };

    scene.time.delayedCall(2000, finish);

    entries.forEach(([key, path]) => {
      if (!scene.cache.audio.exists(key)) {
        scene.load.audio(key, path);
        added++;
      }
    });

    if (added === 0) {
      finish();
      return;
    }

    scene.load.once('complete', finish);
    scene.load.start();
  }

  static resume() {
    try {
      if (AudioManager.ctx?.state === 'suspended') {
        AudioManager.ctx.resume();
      }
    } catch { /* ignore */ }
  }

  static hasFile(key) {
    return !!AUDIO_FILES[key];
  }

  static play(scene, key, config = {}) {
    if (!isSfxEnabled()) return;
    AudioManager.resume();

    const alias = AudioManager.resolveKey(key);
    try {
      if (scene?.cache?.audio?.exists(alias) && scene.sound?.get(alias)) {
        scene.sound.play(alias, { volume: config.volume ?? 0.45, ...config });
        return;
      }
    } catch { /* fall through */ }
    AudioManager.beep(alias);
  }

  static playClick(scene) {
    AudioManager.play(scene, 'button_click', { volume: 0.35 });
  }

  static playBGM(scene, intense = false) {
    if (!isMusicEnabled()) return;
    AudioManager.resume();

    const key = intense ? 'bgm_intense' : 'bgm';
    if (AudioManager.currentBgmKey === key) return;

    AudioManager.stopBGM(scene, false);

    try {
      if (scene?.cache?.audio?.exists(key) && scene.sound?.get(key)) {
        scene.sound.play(key, { volume: intense ? 0.32 : 0.28, loop: true });
        AudioManager.currentBgmKey = key;
        return;
      }
    } catch { /* fall through */ }

    if (intense) {
      AudioManager.startProceduralBgm(intense);
    }
  }

  static stopBGM(scene, clearKey = true) {
    try {
      scene?.sound?.stopByKey?.('bgm');
      scene?.sound?.stopByKey?.('bgm_intense');
    } catch { /* ignore */ }
    AudioManager.stopProceduralBgm();
    if (clearKey) AudioManager.currentBgmKey = null;
  }

  static resolveKey(key) {
    const map = {
      correct: 'quiz_correct',
      wrong: 'quiz_wrong',
      quiz: 'quiz_correct',
      legacy: 'achievement',
      milestone: 'achievement',
      click: 'button_click',
    };
    return map[key] || key;
  }

  static getCtx() {
    if (!AudioManager.ctx) {
      AudioManager.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return AudioManager.ctx;
  }

  static beep(type) {
    if (!isSfxEnabled()) return;
    try {
      const ctx = AudioManager.getCtx();
      if (ctx.state === 'suspended') ctx.resume();

      const presets = {
        jump: { freq: 520, dur: 0.08, type: 'sine', vol: 0.12, slide: 80 },
        hit: { freq: 110, dur: 0.28, type: 'sawtooth', vol: 0.18, slide: -40 },
        point: { freq: 880, dur: 0.1, type: 'sine', vol: 0.1, slide: 120 },
        powerup: { freq: 660, dur: 0.35, type: 'triangle', vol: 0.12, slide: 200 },
        quiz_correct: { freq: 784, dur: 0.15, type: 'sine', vol: 0.14, slide: 100 },
        quiz_wrong: { freq: 220, dur: 0.2, type: 'triangle', vol: 0.1, slide: -30 },
        achievement: { freq: 523, dur: 0.45, type: 'sine', vol: 0.14, slide: 0, arpeggio: [523, 659, 784] },
        gameover: { freq: 330, dur: 0.5, type: 'sine', vol: 0.15, slide: -120 },
        button_click: { freq: 600, dur: 0.05, type: 'sine', vol: 0.08, slide: 0 },
        bgm: null,
        bgm_intense: null,
      };

      const p = presets[type];
      if (!p) return;

      if (p.arpeggio) {
        p.arpeggio.forEach((freq, i) => {
          AudioManager.tone(ctx, { ...p, freq, dur: 0.12, vol: p.vol * 0.8 }, i * 0.1);
        });
        return;
      }

      AudioManager.tone(ctx, p, 0);
    } catch { /* audio blocked until user gesture */ }
  }

  static tone(ctx, p, delay = 0) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = p.type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(p.freq, t);
    if (p.slide) {
      osc.frequency.linearRampToValueAtTime(Math.max(80, p.freq + p.slide), t + p.dur);
    }
    gain.gain.setValueAtTime(p.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + p.dur);
    osc.start(t);
    osc.stop(t + p.dur + 0.02);
  }

  static startProceduralBgm(intense = false) {
    AudioManager.stopProceduralBgm();
    if (!isMusicEnabled()) return;

    try {
      const ctx = AudioManager.getCtx();
      const master = ctx.createGain();
      master.gain.value = intense ? 0.06 : 0.04;
      master.connect(ctx.destination);

      const notes = intense ? [220, 277, 330, 415] : [196, 247, 294, 349];
      const nodes = notes.map((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.value = 0.25;
        osc.connect(g);
        g.connect(master);
        osc.start();
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = intense ? 0.8 + i * 0.1 : 0.3 + i * 0.08;
        lfoG.gain.value = 0.015;
        lfo.connect(lfoG);
        lfoG.connect(g.gain);
        lfo.start();
        return { osc, g, lfo, lfoG };
      });

      AudioManager.bgmNodes = { master, nodes };
      AudioManager.currentBgmKey = intense ? 'bgm_intense' : 'bgm';
    } catch { /* ignore */ }
  }

  static stopProceduralBgm() {
    if (!AudioManager.bgmNodes) return;
    try {
      AudioManager.bgmNodes.nodes?.forEach(({ osc, lfo }) => {
        osc?.stop();
        lfo?.stop();
      });
      AudioManager.bgmNodes.master?.disconnect();
    } catch { /* ignore */ }
    AudioManager.bgmNodes = null;
  }
}

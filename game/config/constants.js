// Shared game constants and configuration

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Canvas zoom — slightly below 1 so the UI doesn't feel cramped on screen */
export const GAME_SCALE_ZOOM = 0.92;

/** On-screen player avatar size (pixels) */
export const PLAYER_DISPLAY_SIZE = 76;
export const PLAYER_HIT_RADIUS = 34;
export const PLAYER_START_X = 270;
/** Horizontal gap between pipe pairs — keeps roughly 2–3 walls on screen */
export const PIPE_SPACING = 450;
/** Random +/- jitter applied to spacing so walls don't feel metronomic */
export const PIPE_SPACING_JITTER = 35;
/** Walls vary in thickness between these widths */
export const PIPE_MIN_WIDTH = 78;
export const PIPE_MAX_WIDTH = 104;
/** Score needed per wall level (non-story modes); each level changes the wall colour */
export const WALL_LEVEL_SCORE = 10;
/** Wall levels from which some walls start drifting gently up/down */
export const WALL_MOTION_LEVEL = 3;

/** Flappy-style wall colour palettes — one per level, cycling */
export const WALL_PALETTES = [
  { name: 'green', light: '#e4fba0', mid: '#8ed334', dark: '#4a8a17', outline: '#2f4a12' },
  { name: 'blue', light: '#c9f1ff', mid: '#3fb3ec', dark: '#1a6aa8', outline: '#0f3553' },
  { name: 'orange', light: '#ffe2a8', mid: '#f5a031', dark: '#b4600f', outline: '#5a2f08' },
  { name: 'purple', light: '#eed6ff', mid: '#ae6ce0', dark: '#6a2f9a', outline: '#351650' },
  { name: 'red', light: '#ffc9c2', mid: '#e9544a', dark: '#9e231c', outline: '#4f110d' },
  { name: 'teal', light: '#c4fff2', mid: '#2fd1b0', dark: '#117a67', outline: '#093d34' },
  { name: 'gold', light: '#fff4b8', mid: '#f2c830', dark: '#a57f0c', outline: '#524006' },
  { name: 'pink', light: '#ffd6ec', mid: '#f0689f', dark: '#a42a5c', outline: '#52142e' },
];

export const GAME_TITLE = 'CST Silver Flight';
export const GAME_TAGLINE = 'Learn • Play • Compete';

export const ROLES = {
  STUDENT: 'student',
  ALUMNI: 'alumni',
  LECTURER: 'lecturer',
};

export const DEPARTMENTS = [
  'IT',
  'Civil',
  'Electrical',
  'Mechanical',
  'Electronics and Communications',
  'Instrumentation and Control',
  'Architecture',
  'Software',
  'Engineering Geology',
  'Water Resources Engineering',
];

export const YEARS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year',
];

/** Alumni graduation batch years (newest first) */
export const BATCH_YEARS = (() => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= 2000; y--) years.push(String(y));
  return years;
})();

export const MODES = {
  // Classic: one scenery, no quizzes, no progression. Id kept so saved scores still count.
  FLAPPY_CST: {
    id: 'flappy_cst',
    name: 'Classic Mode',
    shortName: 'Classic',
    subtitle: 'Traditional Flappy Bird',
    color: 0x2ecc71,
    iconType: 'play',
    description: 'One scenery. Tap to fly, dodge the pipes, beat your best score.',
    hasQuiz: false,
    classic: true,
    leaderboardType: 'global',
  },
  // Silver Jubilee Challenge: Story Mode's stages + the 25 Years Journey CST quizzes as
  // checkpoints between stages. Keeps the old 'journey' id so its scores/leaderboard carry over.
  JOURNEY: {
    id: 'journey',
    name: 'Silver Jubilee Challenge',
    shortName: 'Jubilee',
    subtitle: 'Changing Scenes · Progression · Quizzes',
    color: 0xc0c0c0,
    iconType: 'star',
    description: '6 stages — pass a CST history quiz checkpoint to unlock each next scene.',
    hasQuiz: true,
    quizCategory: 'CST',
    stages: true,
    leaderboardType: 'global',
  },
  DEPARTMENT: {
    id: 'department',
    name: 'Department Challenge',
    shortName: 'Department',
    subtitle: 'Your Dept, Your Quiz',
    color: 0x3498db,
    iconType: 'target',
    description: 'Dept quiz every 10 pts, scaled difficulty.',
    hasQuiz: true,
    quizCategory: 'department',
    leaderboardType: 'department',
  },
};

/**
 * Silver Jubilee Challenge stages (formerly Story Mode levels): score target, scenery and
 * difficulty per stage. Reaching requiredScore opens that stage's CST quiz checkpoint, which must
 * be passed to move on; quizAt lists extra mid-stage quizzes (6 checkpoints + 4 mid-stage = 10).
 */
export const STORY_LEVELS = [
  { level: 1, requiredScore: 5, bgKey: 'story1', initialSpeed: 155, maxSpeed: 220, initialGap: 220, minGap: 170, spawnInterval: 1600, pipeSpacing: 500 },
  { level: 2, requiredScore: 5, bgKey: 'story2', initialSpeed: 175, maxSpeed: 255, initialGap: 205, minGap: 155, spawnInterval: 1500, pipeSpacing: 480 },
  { level: 3, requiredScore: 8, quizAt: [4], bgKey: 'story3', initialSpeed: 195, maxSpeed: 290, initialGap: 190, minGap: 140, spawnInterval: 1400, pipeSpacing: 465 },
  { level: 4, requiredScore: 8, quizAt: [4], bgKey: 'story4', initialSpeed: 215, maxSpeed: 330, initialGap: 175, minGap: 128, spawnInterval: 1300, pipeSpacing: 450 },
  { level: 5, requiredScore: 15, quizAt: [8], bgKey: 'story5', initialSpeed: 240, maxSpeed: 370, initialGap: 160, minGap: 118, spawnInterval: 1200, pipeSpacing: 435 },
  { level: 6, requiredScore: 40, quizAt: [20], bgKey: 'story6', initialSpeed: 270, maxSpeed: 420, initialGap: 145, minGap: 108, spawnInterval: 1100, pipeSpacing: 420 },
];

// Quiz settings — Jubilee: stage checkpoints + mid-stage quizzes; Department: progress-based
// checkpoints (see DEPT_QUIZ_* below and quizEngine.js)
export const QUIZ_BONUS = 3;
export const QUIZ_PENALTY = -3;
export const QUIZ_TIMER_SECONDS = 10;
export const QUIZ_STREAK_BONUS = 5;
export const QUIZ_STREAK_THRESHOLD = 3;

// Department Challenge quiz schedule, counted in walls flown (so quiz bonuses/penalties
// don't shift it): the first checkpoints, then a random gap between each later quiz.
export const DEPT_QUIZ_FIRST_CHECKPOINTS = [3, 6, 9];
export const DEPT_QUIZ_RANDOM_GAP = { min: 3, max: 5 };

// Surprise reward chance (0–1)
export const SURPRISE_REWARD_CHANCE = 0.04;

// Campus background milestones by score (used by Department Challenge)
export const JOURNEY_MILESTONES = [
  { score: 0, era: 'Foundation Years', bgKey: 'bg_foundation', campusKey: 'campus1' },
  { score: 10, era: 'Growth Phase', bgKey: 'bg_growth', campusKey: 'campus2' },
  { score: 25, era: 'Expansion Era', bgKey: 'bg_expansion', campusKey: 'campus3' },
  { score: 50, era: 'Innovation Age', bgKey: 'bg_innovation', campusKey: 'campus4' },
  { score: 100, era: 'Silver Jubilee', bgKey: 'bg_jubilee', campusKey: 'campus5' },
];

// Mode-specific gameplay tuning
export const MODE_CONFIG = {
  flappy_cst: {
    initialSpeed: 180,
    maxSpeed: 320,
    initialGap: 200,
    minGap: 130,
    spawnInterval: 1400,
    pipeSpacing: 450,
    powerUpChance: 0,
    obstacles: ['book', 'exam', 'assignment'],
  },
  // Base for the Silver Jubilee Challenge; speed/gap/spacing are overridden per stage (STORY_LEVELS)
  journey: {
    initialSpeed: 170,
    maxSpeed: 300,
    initialGap: 210,
    minGap: 140,
    spawnInterval: 1500,
    pipeSpacing: 470,
    powerUpChance: 0.18,
    obstacles: ['book', 'exam', 'assignment'],
  },
  department: {
    initialSpeed: 185,
    maxSpeed: 330,
    initialGap: 195,
    minGap: 125,
    spawnInterval: 1350,
    pipeSpacing: 440,
    powerUpChance: 0.2,
    obstacles: ['book', 'exam', 'assignment'],
  },
};

/**
 * How each power-up looks — one shared set of collectible visuals for every mode.
 * Textures are drawn in BootScene.createCollectibleTextures; `color` tints the glow,
 * pickup burst and HUD label accent.
 */
export const POWER_UP_VISUALS = {
  rabbit: { rim: ['#ffe2a3', '#d2650c'], disc: ['#ffc061', '#ec7a0e'], color: 0xff9f1a },
  snail: { rim: ['#b8f7ec', '#12806f'], disc: ['#6be6d0', '#159683'], color: 0x3fd6bf },
  star: { rim: ['#e0d0ff', '#4b24a8'], disc: ['#a883ff', '#5227b8'], color: 0xffd23f },
  shield: { rim: ['#cfeaff', '#1a55a8'], disc: ['#6bb8ff', '#1e5cb4'], color: 0x58b4ff },
  wifi: { rim: ['#c8f8d4', '#15793d'], disc: ['#66e08d', '#18904a'], color: 0x4fe07f },
};
/** On-screen size of a power-up collectible (px) */
export const POWER_UP_DISPLAY_SIZE = 60;

/**
 * Silver Jubilee Challenge power-ups. snail/star/shield reuse the existing slow-motion /
 * 2× score / shield effects; rabbit is a brief speed boost (replaces WiFi Boost in this mode).
 */
export const JUBILEE_POWER_UPS = {
  rabbit: { visual: 'rabbit', label: 'Speed Boost', duration: 3000 },
  snail: { visual: 'snail', label: 'Slow Motion', duration: 3000 },
  star: { visual: 'star', label: '2× Points', duration: 5000 },
  shield: { visual: 'shield', label: 'Shield', duration: 0 },
};
/** Game-speed multiplier while the rabbit boost is active */
export const SPEED_BOOST_MULTIPLIER = 1.5;

// Power-up definitions (Department Challenge — effects unchanged; `visual` picks its look)
export const POWER_UPS = {
  coffee: { iconType: 'coffee', visual: 'snail', duration: 3000, label: 'Slow Motion' },
  shield: { iconType: 'shield', visual: 'shield', duration: 0, label: 'Shield' },
  double: { iconType: 'star', visual: 'star', duration: 5000, label: '2x Score' },
  wifi: { iconType: 'signal', visual: 'wifi', duration: 0, label: 'WiFi Boost' },
};

// Physics
export const GRAVITY = 1200;
export const JUMP_VELOCITY = -380;
export const MAX_FALL_SPEED = 600;

// Avatar
export const AVATAR_SIZE = 128;

// Asset paths (add your files to these locations)
export const ASSETS = {
  logo: 'assets/images/cst-logo.png',
  campus: [
    'assets/images/campus1.png',
    'assets/images/campus2.png',
    'assets/images/campus3.png',
    'assets/images/campus4.png',
    'assets/images/campus5.png',
  ],
  story: [
    'assets/images/story1.jpeg',
    'assets/images/story2.jpeg',
    'assets/images/story3.jpeg',
    'assets/images/story4.jpeg',
    'assets/images/story5.jpeg',
    'assets/images/story6.jpeg',
  ],
  campusVideo: 'assets/video/campus-bg.mp4',
};

// UI colors — CST logo blue + silver jubilee
export const COLORS = {
  cstBlue: '#0067B1',
  cstBlueLight: '#0094DB',
  cstBlueDark: '#004F8A',
  cstBlueGlass: 'rgba(0, 103, 177, 0.35)',
  silver: '#c0c0c0',
  silverLight: '#e8e8e8',
  silverDark: '#8a8a8a',
  blue: '#0067B1',
  blueLight: '#0094DB',
  blueDark: '#004F8A',
  gold: '#ffd700',
  white: '#ffffff',
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.75)',
  glass: 'rgba(0, 103, 177, 0.35)',
};

export const STORAGE_KEYS = {
  PLAYER: 'cst_silver_flight_player',
  BEST_SCORES: 'cst_silver_flight_best',
  SOUND: 'cst_silver_flight_sound',
  MUSIC: 'cst_silver_flight_music',
  SFX: 'cst_silver_flight_sfx',
  AVATAR: 'cst_silver_flight_avatar',
  STATS: 'cst_silver_flight_stats',
  ACHIEVEMENTS: 'cst_silver_flight_achievements',
  MESSAGES: 'cst_silver_flight_messages',
  INTRO_SEEN: 'cst_silver_flight_intro_seen',
};

/** Optional MP3 files — procedural beeps used when missing */
export const AUDIO_FILES = {
  jump: 'assets/audio/jump.mp3',
  hit: 'assets/audio/hit.mp3',
  point: 'assets/audio/point.mp3',
  powerup: 'assets/audio/powerup.mp3',
  quiz_correct: 'assets/audio/quiz-correct.mp3',
  quiz_wrong: 'assets/audio/quiz-wrong.mp3',
  achievement: 'assets/audio/achievement.mp3',
  gameover: 'assets/audio/gameover.mp3',
  bgm: 'assets/audio/bgm.mp3',
  bgm_intense: 'assets/audio/bgm-intense.mp3',
  button_click: 'assets/audio/button-click.mp3',
};

/** Default avatar styles when no photo is taken */
export const AVATAR_STYLES = {
  student: { id: 'student', iconType: 'student', label: 'Student' },
  alumni: { id: 'alumni', iconType: 'student', label: 'Alumni' },
  lecturer: { id: 'lecturer', iconType: 'lecturer', label: 'Lecturer' },
  hacker: { id: 'hacker', iconType: 'lecturer', label: 'Hacker' },
};

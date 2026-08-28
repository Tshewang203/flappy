// Shared game constants and configuration

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Canvas zoom — slightly below 1 so the UI doesn't feel cramped on screen */
export const GAME_SCALE_ZOOM = 0.92;

/** On-screen player avatar size (pixels) */
export const PLAYER_DISPLAY_SIZE = 76;
export const PLAYER_HIT_RADIUS = 34;
export const PLAYER_START_X = 270;
export const PIPE_WIDTH = 88;

export const GAME_TITLE = 'CST Silver Flight';
export const GAME_TAGLINE = 'Learn • Play • Compete';

export const ROLES = {
  STUDENT: 'student',
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

export const MODES = {
  FLAPPY_CST: {
    id: 'flappy_cst',
    name: 'Flappy CST',
    subtitle: 'Classic Flappy Bird',
    color: 0x2ecc71,
    emoji: '🛩️',
    icon: '🛩️',
    iconBadge: '💨',
    description: 'Tap, flap, survive.',
    hasQuiz: false,
    classic: true,
    leaderboardType: 'global',
  },
  JOURNEY: {
    id: 'journey',
    name: '25 Years Journey',
    subtitle: 'CST History Trail',
    color: 0x9b59b6,
    emoji: '🏛️',
    icon: '🏛️',
    iconBadge: '✨',
    description: 'CST history at score milestones',
    hasQuiz: true,
    quizCategory: 'CST',
    leaderboardType: 'global',
  },
  DEPARTMENT: {
    id: 'department',
    name: 'Department Challenge',
    subtitle: 'Your Dept, Your Quiz',
    color: 0x3498db,
    emoji: '🎯',
    icon: '🎯',
    iconBadge: '🔥',
    description: 'Random dept quizzes, scaled difficulty.',
    hasQuiz: true,
    quizCategory: 'department',
    leaderboardType: 'department',
  },
  STORY: {
    id: 'story',
    name: 'Story Mode',
    subtitle: '6 Levels, One Story',
    color: 0xe67e22,
    emoji: '📖',
    icon: '📖',
    iconBadge: '⭐',
    description: 'Reach the score to complete each level.',
    hasQuiz: false,
    classic: false,
    leaderboardType: 'global',
  },
};

/** Story Mode — 6 levels with score targets and background keys */
export const STORY_LEVELS = [
  { level: 1, requiredScore: 10, bgKey: 'story1', initialSpeed: 155, maxSpeed: 220, initialGap: 220, minGap: 170, spawnInterval: 2600 },
  { level: 2, requiredScore: 15, bgKey: 'story2', initialSpeed: 175, maxSpeed: 255, initialGap: 205, minGap: 155, spawnInterval: 2350 },
  { level: 3, requiredScore: 20, bgKey: 'story3', initialSpeed: 195, maxSpeed: 290, initialGap: 190, minGap: 140, spawnInterval: 2100 },
  { level: 4, requiredScore: 25, bgKey: 'story4', initialSpeed: 215, maxSpeed: 330, initialGap: 175, minGap: 128, spawnInterval: 1900 },
  { level: 5, requiredScore: 30, bgKey: 'story5', initialSpeed: 240, maxSpeed: 370, initialGap: 160, minGap: 118, spawnInterval: 1700 },
  { level: 6, requiredScore: 40, bgKey: 'story6', initialSpeed: 270, maxSpeed: 420, initialGap: 145, minGap: 108, spawnInterval: 1500 },
];

// Quiz settings — Journey: fixed score milestones; Dept: random probability (see quizEngine.js)
export const JOURNEY_QUIZ_SCORES = [5, 10, 15, 20, 25, 30];
export const QUIZ_BONUS = 3;
export const QUIZ_PENALTY = -3;
export const QUIZ_TIMER_SECONDS = 10;
export const QUIZ_STREAK_BONUS = 5;
export const QUIZ_STREAK_THRESHOLD = 3;

// Department mode random quiz tuning
export const DEPT_QUIZ_MIN_OBSTACLES = 8;
export const DEPT_QUIZ_COOLDOWN = 5;

// Surprise reward chance (0–1)
export const SURPRISE_REWARD_CHANCE = 0.04;

// Journey mode background milestones (score thresholds)
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
    spawnInterval: 2200,
    powerUpChance: 0,
    obstacles: ['book', 'exam', 'assignment'],
  },
  journey: {
    initialSpeed: 170,
    maxSpeed: 300,
    initialGap: 210,
    minGap: 140,
    spawnInterval: 2400,
    powerUpChance: 0.18,
    obstacles: ['book', 'exam', 'assignment'],
  },
  department: {
    initialSpeed: 185,
    maxSpeed: 330,
    initialGap: 195,
    minGap: 125,
    spawnInterval: 2100,
    powerUpChance: 0.2,
    obstacles: ['book', 'exam', 'assignment'],
  },
  story: {
    initialSpeed: 155,
    maxSpeed: 220,
    initialGap: 220,
    minGap: 170,
    spawnInterval: 2600,
    powerUpChance: 0,
    obstacles: ['book', 'exam', 'assignment'],
  },
};

// Power-up definitions
export const POWER_UPS = {
  coffee: { emoji: '☕', duration: 3000, label: 'Slow Motion' },
  shield: { emoji: '🛡️', duration: 0, label: 'Shield' },
  double: { emoji: '⭐', duration: 5000, label: '2x Score' },
  wifi: { emoji: '📶', duration: 0, label: 'WiFi Boost' },
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
    'assets/images/story1.png',
    'assets/images/story2.png',
    'assets/images/story3.png',
    'assets/images/story4.png',
    'assets/images/story5.png',
    'assets/images/story6.png',
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
  student: { id: 'student', emoji: '🎓', label: 'Student' },
  lecturer: { id: 'lecturer', emoji: '👨‍🏫', label: 'Lecturer' },
  hacker: { id: 'hacker', emoji: '🧑‍💻', label: 'Hacker' },
};

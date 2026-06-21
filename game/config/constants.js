// Shared game constants and configuration

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

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
    subtitle: 'Classic Mode',
    color: 0x2ecc71,
    emoji: '📚',
    description: 'Navigate through books, exams & assignments',
  },
  JOURNEY: {
    id: 'journey',
    name: '25 Years Journey',
    subtitle: 'Story Mode',
    color: 0x9b59b6,
    emoji: '🎓',
    description: 'Experience CST evolution through 25 years',
  },
  HACKATHON: {
    id: 'hackathon',
    name: 'Hackathon Escape',
    subtitle: 'Challenge Mode',
    color: 0x3498db,
    emoji: '💻',
    description: 'Fast-paced escape from bugs & deadlines',
  },
};

// Journey mode background milestones (score thresholds)
export const JOURNEY_MILESTONES = [
  { score: 0, era: 'Foundation Years', bgColor: 0x1a1a2e, accent: 0xc0c0c0 },
  { score: 10, era: 'Growth Phase', bgColor: 0x16213e, accent: 0xa8d8ea },
  { score: 25, era: 'Expansion Era', bgColor: 0x0f3460, accent: 0xe94560 },
  { score: 50, era: 'Innovation Age', bgColor: 0x1a1a40, accent: 0x00d2ff },
  { score: 100, era: 'Silver Jubilee', bgColor: 0x2d1b69, accent: 0xffd700 },
];

// Mode-specific gameplay tuning
export const MODE_CONFIG = {
  flappy_cst: {
    initialSpeed: 180,
    maxSpeed: 320,
    initialGap: 200,
    minGap: 130,
    spawnInterval: 2200,
    powerUpChance: 0.15,
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
  hackathon: {
    initialSpeed: 220,
    maxSpeed: 400,
    initialGap: 180,
    minGap: 110,
    spawnInterval: 1800,
    powerUpChance: 0.25,
    obstacles: ['bug', 'error', 'deadline'],
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

// UI colors (silver jubilee theme)
export const COLORS = {
  silver: '#c0c0c0',
  silverLight: '#e8e8e8',
  silverDark: '#8a8a8a',
  blue: '#1e3a5f',
  blueLight: '#2d5a8e',
  blueDark: '#0f1f33',
  gold: '#ffd700',
  white: '#ffffff',
  text: '#e8e8e8',
  textMuted: '#a0aec0',
};

export const STORAGE_KEYS = {
  PLAYER: 'cst_silver_flight_player',
  BEST_SCORES: 'cst_silver_flight_best',
  SOUND: 'cst_silver_flight_sound',
};

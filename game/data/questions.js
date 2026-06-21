/**
 * Preloaded question bank for CST history and department quizzes.
 * Questions are loaded at boot — never fetched during gameplay.
 */

export const QUESTIONS = {
  CST: [
    {
      q: 'What does CST stand for?',
      options: [
        'College of Science and Technology',
        'Center for Software Training',
        'College of Systems and Telecom',
        'Campus of Science and Tech',
      ],
      answer: 0,
    },
    {
      q: 'CST is celebrating which milestone in this game?',
      options: ['10th Anniversary', '20th Anniversary', '25th Silver Jubilee', '50th Golden Jubilee'],
      answer: 2,
    },
    {
      q: 'The Silver Jubilee marks how many years of CST?',
      options: ['15 years', '20 years', '25 years', '30 years'],
      answer: 2,
    },
    {
      q: 'Which theme best represents CST\'s Silver Jubilee?',
      options: ['Innovation & Legacy', 'Speed & Competition', 'Music & Arts', 'Sports Only'],
      answer: 0,
    },
    {
      q: 'CST focuses primarily on which areas?',
      options: ['Science & Technology', 'Law & Politics', 'Medicine Only', 'Agriculture Only'],
      answer: 0,
    },
    {
      q: 'The 25 Years Journey mode celebrates CST\'s:',
      options: ['Sports achievements', 'Evolution over 25 years', 'Holiday calendar', 'Exam schedule'],
      answer: 1,
    },
    {
      q: 'Silver Jubilee celebrations often highlight:',
      options: ['Past achievements & future vision', 'Only final exams', 'Winter break', 'Library fines'],
      answer: 0,
    },
    {
      q: 'CST students belong to different:',
      options: ['Planets', 'Departments', 'Countries only', 'Time zones'],
      answer: 1,
    },
  ],

  IT: [
    {
      q: 'What does HTTP stand for?',
      options: [
        'HyperText Transfer Protocol',
        'High Tech Transfer Process',
        'Hyperlink Text Terminal Program',
        'Host Transfer Text Protocol',
      ],
      answer: 0,
    },
    {
      q: 'Which language is commonly used for web frontends?',
      options: ['JavaScript', 'Assembly', 'Fortran', 'COBOL'],
      answer: 0,
    },
    {
      q: 'What does CPU stand for?',
      options: [
        'Central Processing Unit',
        'Computer Personal Utility',
        'Central Program Unit',
        'Core Processing Utility',
      ],
      answer: 0,
    },
    {
      q: 'Which device connects a local network to the internet?',
      options: ['Router', 'Keyboard', 'Monitor', 'Printer'],
      answer: 0,
    },
    {
      q: 'What does SQL stand for?',
      options: [
        'Structured Query Language',
        'Simple Question Logic',
        'System Quality Layer',
        'Standard Queue List',
      ],
      answer: 0,
    },
  ],

  Civil: [
    {
      q: 'Which material is most commonly used in reinforced concrete?',
      options: ['Steel', 'Wood', 'Plastic', 'Glass'],
      answer: 0,
    },
    {
      q: 'What does a foundation primarily support?',
      options: ['Building load', 'Wind only', 'Paint color', 'Lighting'],
      answer: 0,
    },
    {
      q: 'Which structure carries water across valleys?',
      options: ['Bridge', 'Dam only', 'Window', 'Door'],
      answer: 0,
    },
    {
      q: 'Surveying is used to measure:',
      options: ['Land and elevations', 'Sound waves', 'Electric current', 'Air pressure'],
      answer: 0,
    },
    {
      q: 'Concrete gains strength through:',
      options: ['Hydration of cement', 'Freezing', 'Evaporation only', 'Painting'],
      answer: 0,
    },
  ],

  Electrical: [
    {
      q: 'The unit of electric current is:',
      options: ['Ampere', 'Volt', 'Watt', 'Ohm'],
      answer: 0,
    },
    {
      q: 'Ohm\'s Law relates voltage, current, and:',
      options: ['Resistance', 'Frequency', 'Power factor', 'Capacitance'],
      answer: 0,
    },
    {
      q: 'AC stands for:',
      options: ['Alternating Current', 'Active Circuit', 'Automatic Control', 'Applied Charge'],
      answer: 0,
    },
    {
      q: 'A transformer is used to:',
      options: ['Change voltage levels', 'Store water', 'Measure temperature', 'Filter air'],
      answer: 0,
    },
    {
      q: 'The unit of electrical power is:',
      options: ['Watt', 'Ampere', 'Coulomb', 'Henry'],
      answer: 0,
    },
  ],

  Mechanical: [
    {
      q: 'Newton\'s First Law is also called the law of:',
      options: ['Inertia', 'Gravity', 'Thermodynamics', 'Friction'],
      answer: 0,
    },
    {
      q: 'Which machine element transfers rotational motion?',
      options: ['Gear', 'Spring only', 'Bolt only', 'Gasket'],
      answer: 0,
    },
    {
      q: 'Stress is defined as force per unit:',
      options: ['Area', 'Volume', 'Time', 'Length'],
      answer: 0,
    },
    {
      q: 'An engine converts chemical energy into:',
      options: ['Mechanical energy', 'Light only', 'Sound only', 'Magnetism'],
      answer: 0,
    },
    {
      q: 'CAD in engineering stands for:',
      options: [
        'Computer-Aided Design',
        'Central Automatic Drive',
        'Circuit Analysis Diagram',
        'Control And Dynamics',
      ],
      answer: 0,
    },
  ],

  'Electronics and Communications': [
    {
      q: 'A diode allows current in:',
      options: ['One direction', 'All directions', 'No direction', 'Random directions'],
      answer: 0,
    },
    {
      q: 'FM stands for:',
      options: ['Frequency Modulation', 'Fast Memory', 'Field Magnet', 'Fixed Mode'],
      answer: 0,
    },
    {
      q: 'Which component stores electric charge?',
      options: ['Capacitor', 'Resistor', 'Inductor only', 'Fuse'],
      answer: 0,
    },
    {
      q: 'The binary number system uses digits:',
      options: ['0 and 1', '0 to 9', '1 to 10', 'A to F only'],
      answer: 0,
    },
    {
      q: 'An amplifier increases:',
      options: ['Signal strength', 'Weight', 'Temperature', 'Pressure'],
      answer: 0,
    },
  ],

  'Instrumentation and Control': [
    {
      q: 'A sensor measures a physical quantity and converts it to:',
      options: ['A signal', 'Sound only', 'Light only', 'Heat only'],
      answer: 0,
    },
    {
      q: 'PID control stands for Proportional, Integral, and:',
      options: ['Derivative', 'Dynamic', 'Digital', 'Direct'],
      answer: 0,
    },
    {
      q: 'A transducer converts one form of energy to:',
      options: ['Another form', 'Nothing', 'Only heat', 'Only light'],
      answer: 0,
    },
    {
      q: 'Calibration ensures instruments give:',
      options: ['Accurate readings', 'Random values', 'No output', 'Maximum speed'],
      answer: 0,
    },
    {
      q: 'PLC in automation stands for:',
      options: [
        'Programmable Logic Controller',
        'Power Line Circuit',
        'Process Load Cell',
        'Primary Logic Chip',
      ],
      answer: 0,
    },
  ],

  Architecture: [
    {
      q: 'A blueprint is a type of:',
      options: ['Technical drawing', 'Musical score', 'Recipe', 'Novel'],
      answer: 0,
    },
    {
      q: 'Load-bearing walls support:',
      options: ['Structural weight', 'Only paint', 'Only windows', 'Only doors'],
      answer: 0,
    },
    {
      q: 'Sustainable architecture focuses on:',
      options: ['Energy efficiency', 'Only decoration', 'Only color', 'Only furniture'],
      answer: 0,
    },
    {
      q: 'An elevation drawing shows a building\'s:',
      options: ['Exterior view', 'Foundation only', 'Wiring only', 'Plumbing only'],
      answer: 0,
    },
    {
      q: 'Scale in architectural drawings indicates:',
      options: ['Proportional size', 'Paint color', 'Room temperature', 'Sound level'],
      answer: 0,
    },
  ],

  Software: [
    {
      q: 'Git is primarily used for:',
      options: ['Version control', 'Image editing', 'Video streaming', 'Word processing'],
      answer: 0,
    },
    {
      q: 'An API allows different software to:',
      options: ['Communicate', 'Sleep', 'Print only', 'Draw only'],
      answer: 0,
    },
    {
      q: 'OOP stands for:',
      options: ['Object-Oriented Programming', 'Open Output Protocol', 'Online Operation Process', 'Optical Output Program'],
      answer: 0,
    },
    {
      q: 'A bug in software is a:',
      options: ['Error or defect', 'Feature always', 'Hardware part', 'Network cable'],
      answer: 0,
    },
    {
      q: 'Agile development emphasizes:',
      options: ['Iterative delivery', 'No planning', 'No testing', 'No teamwork'],
      answer: 0,
    },
  ],

  'Engineering Geology': [
    {
      q: 'Engineering geology studies rock and soil for:',
      options: ['Construction safety', 'Cooking', 'Painting', 'Music'],
      answer: 0,
    },
    {
      q: 'A landslide is a type of:',
      options: ['Mass movement', 'Chemical reaction', 'Electrical fault', 'Sound wave'],
      answer: 0,
    },
    {
      q: 'Groundwater can affect:',
      options: ['Foundation stability', 'Screen brightness', 'Keyboard speed', 'Printer ink'],
      answer: 0,
    },
    {
      q: 'Igneous rocks form from:',
      options: ['Cooled magma', 'Compressed leaves', 'Dissolved salt', 'Wind only'],
      answer: 0,
    },
    {
      q: 'Site investigation before construction includes:',
      options: ['Soil testing', 'Menu planning', 'Logo design', 'Song writing'],
      answer: 0,
    },
  ],

  'Water Resources Engineering': [
    {
      q: 'A dam is built primarily to:',
      options: ['Store or control water', 'Generate music', 'Print documents', 'Cool computers'],
      answer: 0,
    },
    {
      q: 'The hydrological cycle includes evaporation and:',
      options: ['Precipitation', 'Combustion', 'Oxidation', 'Fermentation'],
      answer: 0,
    },
    {
      q: 'Irrigation is used for:',
      options: ['Crop watering', 'Building walls', 'Painting roads', 'Writing code'],
      answer: 0,
    },
    {
      q: 'Flood control structures include:',
      options: ['Levees and reservoirs', 'Keyboards', 'Monitors', 'Speakers'],
      answer: 0,
    },
    {
      q: 'Water treatment removes:',
      options: ['Contaminants', 'Gravity', 'Sunlight', 'Sound'],
      answer: 0,
    },
  ],
};

/**
 * Pick a random question for a category with difficulty scaling.
 */
export function getDifficultyForProgress(obstacleCount) {
  if (obstacleCount < 30) return 'easy';
  if (obstacleCount < 60) return 'medium';
  return 'hard';
}

export function getRandomQuestion(category, difficulty = 'easy') {
  const pool = QUESTIONS[category] || QUESTIONS.CST;
  if (!pool || pool.length === 0) return QUESTIONS.CST[0];

  const withDiff = pool.map((q, i) => ({
    ...q,
    difficulty: q.difficulty || (i < pool.length * 0.4 ? 'easy' : i < pool.length * 0.7 ? 'medium' : 'hard'),
  }));

  const filtered = withDiff.filter((q) => q.difficulty === difficulty);
  const source = filtered.length > 0 ? filtered : withDiff;
  return source[Math.floor(Math.random() * source.length)];
}

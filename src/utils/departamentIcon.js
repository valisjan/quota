function normalitza(nom) {
  return (nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function departamentCategoria(nom) {
  const n = normalitza(nom);
  if (/catala/.test(n)) return 'catala';
  if (/angles/.test(n)) return 'angles';
  if (/frances/.test(n)) return 'frances';
  if (/alemany/.test(n)) return 'alemany';
  if (/castella/.test(n)) return 'castella';
  if (/(cultura classica|cultura clasica|classic|clasic|latin|grec)/.test(n)) return 'classiques';
  if (/lleng/.test(n)) return 'llengues';
  if (/(matemat|mates)/.test(n)) return 'mates';
  if (/(agraria|agrari|agric|jardi|forestal|hort)/.test(n)) return 'agraria';
  if (/(biologia|geologia|\bbg\b)/.test(n)) return 'biogeo';
  if (/(fisica|quimica|\bf\.?q\.?\b)/.test(n)) return 'fisicaQuimica';
  if (/cienc/.test(n)) return 'ciencies';
  if (/(geografia|historia|social)/.test(n)) return 'socials';
  if (/(tecnologia|informatica|digital)/.test(n)) return 'tecnologia';
  if (/(musica|arts esceniques)/.test(n)) return 'musica';
  if (/(plastica|dibuix|visual|art)/.test(n)) return 'arts';
  if (/(educacio fisica|esport|\be\.?f\.?\b)/.test(n)) return 'ef';
  if (/(orientacio|orientador|suport)/.test(n)) return 'orientacio';
  if (/(religio|religion)/.test(n)) return 'religio';
  if (/(filosofia|valors|etica)/.test(n)) return 'humanitats';
  if (/(economia|empresa|administracio|comert|comptabilitat)/.test(n)) return 'economia';
  if (/(^|\s)ia($|\s)|pastisser|forn|fleca|aliment|cuina|hostaleria/.test(n)) return 'pastisseria';
  if (/(\bfol\b|formacio.*laboral|orientacio laboral)/.test(n)) return 'fol';
  if (/(sanitat|salut|infermeria|farmacia|auxiliar)/.test(n)) return 'sanitat';
  return 'generic';
}

export function departamentIconText(nom) {
  const textos = {
    castella: '✒',
    llengues: 'abc',
    mates: 'πe',
    classiques: 'ΑΩ',
    agraria: '🌱',
    biogeo: '🌿',
    fisicaQuimica: '⚛',
    ciencies: '🧪',
    socials: '🌍',
    tecnologia: '⚙',
    musica: '♪',
    arts: '🎨',
    ef: '⚽',
    orientacio: '🧭',
    humanitats: 'Φ',
    religio: '✝',
    economia: '€',
    pastisseria: '🥐',
    fol: '⚖',
    sanitat: '⚕',
  };
  return textos[departamentCategoria(nom)] || '';
}

export function departamentFlagClass(nom) {
  const flags = {
    catala: 'dept-flag-catala',
    angles: 'dept-flag-angles',
    frances: 'dept-flag-frances',
    alemany: 'dept-flag-alemany',
  };
  return flags[departamentCategoria(nom)] || '';
}

export function departamentIconPaths(nom) {
  const icons = {
    castella: [
      'M12 11.75c2.15 0 3.9-1.75 3.9-3.9S14.15 3.95 12 3.95 8.1 5.7 8.1 7.85s1.75 3.9 3.9 3.9Z',
      'M6.25 20.25c.65-3.75 2.75-6 5.75-6s5.1 2.25 5.75 6',
      'M7.25 11.25c1.25.95 2.8 1.45 4.75 1.45s3.5-.5 4.75-1.45',
      'M17.6 4.9c1.15.7 1.9 1.85 1.9 3.1 0 1.65-1.25 3.05-3 3.65M6.4 4.9C5.25 5.6 4.5 6.75 4.5 8c0 1.65 1.25 3.05 3 3.65',
    ],
    llengues: [
      'M4.5 5.25A2.25 2.25 0 0 1 6.75 3H20v16.5H6.75a2.25 2.25 0 0 0-2.25 2.25V5.25Z',
      'M8 7.5h8M8 11h6M6.75 19.5V3',
    ],
    mates: [],
    classiques: [
      'M5.5 20.25h13M7 17.5h10M8.25 17.5V8.25M15.75 17.5V8.25',
      'M6.75 8.25h10.5L12 3.75 6.75 8.25Z',
      'M9.5 11h5M9.5 13.5h5',
    ],
    agraria: [
      'M12 20.5V10.75',
      'M12 14.25c-3.75 0-6.25-2.2-6.25-5.5V6.5H8c3.3 0 4 2.3 4 7.75Z',
      'M12 16.25c3.75 0 6.25-2.2 6.25-5.5V8.5H16c-3.3 0-4 2.3-4 7.75Z',
      'M8 20.5h8',
    ],
    biogeo: [
      'M6.5 19.5c6.75 0 11-4.4 11-11.5V4.5H14c-7.1 0-11.5 4.25-11.5 11 0 2.2 1.8 4 4 4Z',
      'M6.5 19.5c2.5-5.25 5.75-8.5 11-11',
      'M14.75 19.25a5.5 5.5 0 0 0 3.75-5.2 5.5 5.5 0 0 0-3.75 5.2Z',
    ],
    fisicaQuimica: [
      'M12 12m-2.25 0a2.25 2.25 0 1 0 4.5 0 2.25 2.25 0 1 0-4.5 0',
      'M4.75 12c2.15-3.75 4.6-5.75 7.25-5.75s5.1 2 7.25 5.75c-2.15 3.75-4.6 5.75-7.25 5.75S6.9 15.75 4.75 12Z',
      'M7.25 5.75c4.2.3 7.7 4.1 9.5 12.5M16.75 5.75c-4.2.3-7.7 4.1-9.5 12.5',
    ],
    ciencies: [
      'M10 3.75v5.4l-4.4 7.65A2.25 2.25 0 0 0 7.55 20.25h8.9a2.25 2.25 0 0 0 1.95-3.45L14 9.15v-5.4',
      'M8.5 3.75h7M8.25 15.5h7.5',
    ],
    socials: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M3.75 12h16.5M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18',
    ],
    tecnologia: [
      'M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8A3.5 3.5 0 0 1 16 19.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5Z',
      'M9 9h6v6H9V9ZM9 2.75v2M15 2.75v2M9 19.25v2M15 19.25v2M2.75 9h2M2.75 15h2M19.25 9h2M19.25 15h2',
    ],
    musica: [
      'M9 18.75V6l12-2v12.75',
      'M9 18.75A2.25 2.25 0 1 1 6.75 16.5 2.25 2.25 0 0 1 9 18.75ZM21 16.75A2.25 2.25 0 1 1 18.75 14.5 2.25 2.25 0 0 1 21 16.75Z',
    ],
    arts: [
      'M12 20.25a8.25 8.25 0 1 1 8.25-8.25c0 1.1-.9 1.75-2 1.75h-1.5a1.75 1.75 0 0 0-1.75 1.75c0 1.1.65 2 1.75 2 .7 0 1.25.5 1.25 1.15 0 1.05-2.65 1.85-6 1.85Z',
      'M7.75 10.25h.01M10.5 7.75h.01M14 7.75h.01M16.25 10.5h.01',
    ],
    ef: [
      'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
      'M4.5 9.75c3.1.45 5.7-.3 7.5-2.25 1.8 1.95 4.4 2.7 7.5 2.25',
      'M7.25 19.25c-.5-3.55.7-6.05 4.75-7.25 4.05 1.2 5.25 3.7 4.75 7.25',
      'M12 3v18',
    ],
    orientacio: [
      'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
      'm10 14 2-6 2 6-2-1-2 1Z',
    ],
    humanitats: [
      'M5.5 6.5h13M5.5 11h13M5.5 15.5h8',
      'M4 3.75h16v16.5H4V3.75Z',
    ],
    religio: [
      'M12 3.75v16.5',
      'M7.75 8.25h8.5',
      'M6.5 20.25h11',
      'M8.75 14.75c.9-1.7 2-2.55 3.25-2.55s2.35.85 3.25 2.55',
    ],
    economia: [
      'M4 9h16M6 9V7l6-3 6 3v2M7 9v8M12 9v8M17 9v8M5 17h14M4 20h16',
    ],
    pastisseria: [
      'M4.25 14.5c.5-3.95 3.9-7 7.75-7s7.25 3.05 7.75 7c.2 1.6-.95 3-2.55 3H6.8c-1.6 0-2.75-1.4-2.55-3Z',
      'M7.25 14.25c.35-1.3 1.3-2.25 2.5-2.25 1.1 0 1.85.65 2.25 1.55.4-.9 1.15-1.55 2.25-1.55 1.2 0 2.15.95 2.5 2.25',
      'M6 17.5h12',
    ],
    fol: [
      'M12 3.75H5.25A1.5 1.5 0 0 0 3.75 5.25v13.5A1.5 1.5 0 0 0 5.25 20.25h13.5A1.5 1.5 0 0 0 20.25 18.75V12',
      'M7.5 8.25h4.5M7.5 11.25h6M7.5 14.25h3',
      'M15.75 3.75l1.5 1.5L12 10.5l-2.25.75.75-2.25 5.25-5.25Z',
    ],
    sanitat: [
      'M12 3.75v16.5M3.75 12h16.5',
    ],
  };
  return icons[departamentCategoria(nom)] || [];
}

export function departamentInicials(nom) {
  return (nom || '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'D';
}

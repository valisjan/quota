export const TIPUS_NO_LECTIUS = new Set(['C']);

export function netejarText(valor) {
  return (valor || '').toString().replace(/[\r\n]+/g, ' ').trim();
}

export function senseAccents(valor) {
  return netejarText(valor)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function normalitzar(valor) {
  return senseAccents(valor).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function codiBase(valor, fallback) {
  const net = senseAccents(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (net || fallback).slice(0, 14);
}

export function codiUnic(base, usats, maxLength = 14) {
  let codi = base || 'X';
  let i = 2;
  while (usats.has(codi)) {
    const sufix = String(i);
    codi = `${base.slice(0, Math.max(1, maxLength - sufix.length))}${sufix}`;
    i++;
  }
  usats.add(codi);
  return codi;
}

export function codiProfessorBase(valor, fallback = 'PROF') {
  const net = senseAccents(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return (net || fallback).slice(0, 4);
}

export function grupSenseCurs(valor) {
  const text = senseAccents(netejarText(valor)).toUpperCase().replace(/\s+/g, '');
  const compacte = text.replace(/[-_./]/g, '');
  if (!text) return '';

  const batxLlarg = compacte.match(/^[12](?:R|N)?B(?:ATX?|ACH)([A-Z])$/);
  if (batxLlarg) return batxLlarg[1];

  const batxCurt = compacte.match(/^[12](?:R|N)?B([A-Z])$/);
  if (batxCurt) return batxCurt[1];

  const esoLlarg = compacte.match(/^[1-4](?:R|N|T)?ESO([A-Z])$/);
  if (esoLlarg) return esoLlarg[1];

  const esoCurt = compacte.match(/^[1-4]E([A-Z])$/);
  if (esoCurt) return esoCurt[1];

  return '';
}

export function normalitzarGrup(grup) {
  const text = netejarText(grup);
  if (!text) return text;
  if (text.includes('+')) return text.split('+').map(normalitzarGrup).join('+');
  const grupIncorporat = grupSenseCurs(text);
  if (grupIncorporat) return grupIncorporat;
  if (text.length <= 1) return text;
  if (/^[A-Za-z]+$/.test(text)) return text.split('').join('+');
  return text;
}

function codiCursBatxUntis(numero) {
  return numero === '2' ? '2b' : `${numero}B`;
}

export function codisCurs(curs) {
  const text = senseAccents(netejarText(curs)).toUpperCase().replace(/\s+/g, '');
  const compacte = text.replace(/[-_./]/g, '');
  const batxAmbGrup = compacte.match(/^([12])(?:R|N)?B(?:ATX?|ACH)?[A-Z]$/);
  if (batxAmbGrup) return [codiCursBatxUntis(batxAmbGrup[1])];
  const esoAmbGrup = compacte.match(/^([1-4])(?:R|N|T)?ESO[A-Z]$/) || compacte.match(/^([1-4])E[A-Z]$/);
  if (esoAmbGrup) return [`${esoAmbGrup[1]}ESO`];

  const norm = senseAccents(netejarText(curs)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const eso = norm.match(/^([1-4])[A-Z]*ESO/);
  if (eso) return [`${eso[1]}ESO`];
  const batx = norm.match(/^([12])[A-Z]*B(?:AT)?X?/);
  if (batx) return [codiCursBatxUntis(batx[1])];
  return [norm].filter(Boolean);
}

export function grupsClasse(classe) {
  const grup = netejarText(classe.grup) || grupSenseCurs(classe.curs);
  return normalitzarGrup(grup)
    .split('+')
    .map((grup) => netejarText(grup).toUpperCase())
    .filter(Boolean);
}

export function codisClasse(classe) {
  const cursos = codisCurs(classe.curs);
  const grups = grupsClasse(classe);
  if (!cursos.length || !grups.length) return [];
  return cursos.flatMap((curs) =>
    grups.map((g) => `${curs}-${g}`).filter(Boolean)
  );
}

export function expandirClassePerGrups(classe) {
  const grup = normalitzarGrup(classe.grup);
  if (!grup || !grup.includes('+')) return [classe];
  return grup.split('+')
    .map((g) => netejarText(g))
    .filter(Boolean)
    .map((g) => ({ ...classe, grup: g }));
}

export function clauGrups(grups) {
  return [...new Set(grups)].sort((a, b) => a.localeCompare(b)).join('+');
}

export function esSubconjuntGrups(grups, grupsContenidor) {
  const contenidor = new Set(grupsContenidor);
  return grups.length > 0 && grups.every((grup) => contenidor.has(grup));
}

export function compactarGrup(grup) {
  return normalitzarGrup(grup).replace(/\+/g, '').toUpperCase();
}

export function valorDif(valor, numeric = false) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (numeric) return String(valor);
  return `"${netejarText(valor).replace(/"/g, '""')}"`;
}

export function liniaDif(camps, numerics = new Set()) {
  return camps.map((camp, index) => valorDif(camp, numerics.has(index))).join(',');
}

export function campsBuids(total) {
  return Array.from({ length: total }, () => '');
}

export function decimalUntis(valor) {
  return Number(valor || 0).toFixed(5);
}

export function parseCsvLine(line) {
  const camps = [];
  let actual = '';
  let dinsCometes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (dinsCometes && line[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        dinsCometes = !dinsCometes;
      }
    } else if (ch === ',' && !dinsCometes) {
      camps.push(actual);
      actual = '';
    } else {
      actual += ch;
    }
  }

  camps.push(actual);
  return camps;
}

export function parseGpu002(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const camps = parseCsvLine(line);
      return {
        index,
        camps,
        num: camps[0] || '',
        hores: Number(camps[1]) || 0,
        classe: camps[4] || '',
        professor: camps[5] || '',
        materia: camps[6] || '',
        text: camps[17] || '',
      };
    });
}

export function descarregarText(nomFitxer, contingut) {
  const blob = new Blob([contingut], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomFitxer;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function limitsJornada(professor) {
  if (professor.jornada === 'M') return 9;
  if (professor.jornada === 'T') return 13;
  return 18;
}

export function obtenirProfessorsClasse(classe) {
  const professors = Array.isArray(classe.professors) ? classe.professors : [];
  const noms = professors.length
    ? professors
    : [classe.professorAssignat].filter(Boolean);
  return [...new Set(noms.map(netejarText).filter(Boolean))];
}

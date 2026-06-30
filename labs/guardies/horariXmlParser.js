(function exposeHorariXmlParser(global) {
  const DIA_LABELS = {
    '1': 'Dilluns',
    '2': 'Dimarts',
    '3': 'Dimecres',
    '4': 'Dijous',
    '5': 'Divendres',
    '6': 'Dissabte',
    '7': 'Diumenge',
  };

  function atribut(node, nom) {
    return (node && node.getAttribute && node.getAttribute(nom)) || '';
  }

  function textNet(text) {
    return (text || '').toString().replace(/^\uFEFF/, '').trim();
  }

  function parseXmlRobust(text) {
    const parser = new DOMParser();
    const net = textNet(text);
    let xml = parser.parseFromString(net, 'application/xml');
    let error = xml.querySelector('parsererror');

    if (error) {
      const escapades = net.replace(
        /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[a-fA-F0-9]+;)/g,
        '&amp;'
      );
      xml = parser.parseFromString(escapades, 'application/xml');
      error = xml.querySelector('parsererror');
    }

    if (error) {
      const detall = (error.textContent || '').replace(/\s+/g, ' ').slice(0, 180);
      throw new Error(`No s'ha pogut llegir l'XML. ${detall}`);
    }

    return xml;
  }

  function nodesPerTag(node, tag) {
    const directes = Array.from(node.getElementsByTagName(tag));
    if (directes.length) return directes;
    return Array.from(node.getElementsByTagName('*')).filter(
      (el) => (el.localName || el.nodeName || '').toUpperCase() === tag
    );
  }

  function diaLabel(dia) {
    return DIA_LABELS[dia] || `Dia ${dia || '?'}`;
  }

  function franjaKey(dia, hora) {
    return `${dia || ''}|${hora || ''}`;
  }

  function sessioKey(sessio) {
    return [
      sessio.index,
      sessio.placa,
      sessio.dia,
      sessio.hora,
      sessio.curs,
      sessio.grup,
      sessio.materia,
      sessio.activitat,
      sessio.aula,
    ].join('|');
  }

  function normalitzarSessio(node, index) {
    const sessio = {
      index,
      placa: atribut(node, 'placa'),
      curs: atribut(node, 'curs'),
      grup: atribut(node, 'grup'),
      dia: atribut(node, 'dia'),
      hora: atribut(node, 'hora'),
      durada: Number(atribut(node, 'durada')) || 0,
      aula: atribut(node, 'aula'),
      materia: atribut(node, 'materia'),
      activitat: atribut(node, 'activitat'),
    };

    sessio.key = sessioKey(sessio);
    sessio.franja = franjaKey(sessio.dia, sessio.hora);
    sessio.diaLabel = diaLabel(sessio.dia);
    sessio.teClasse = Boolean(sessio.curs || sessio.grup || sessio.materia);
    sessio.teActivitat = Boolean(sessio.activitat);
    sessio.tipus = sessio.teActivitat && !sessio.teClasse
      ? 'activitat'
      : sessio.teClasse
      ? 'classe'
      : 'altres';

    return sessio;
  }

  function uniq(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function comptar(values) {
    const map = new Map();
    values.filter(Boolean).forEach((value) => map.set(value, (map.get(value) || 0) + 1));
    return Array.from(map.entries())
      .map(([valor, count]) => ({ valor, count }))
      .sort((a, b) => String(a.valor).localeCompare(String(b.valor), 'ca', { numeric: true }));
  }

  function ordenarPerDiaHora(a, b) {
    const dia = Number(a.dia) - Number(b.dia);
    if (dia) return dia;
    return (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true });
  }

  function ordenarSessions(a, b) {
    const franja = ordenarPerDiaHora(a, b);
    if (franja) return franja;
    return (a.placa || '').localeCompare(b.placa || '', 'ca', { numeric: true });
  }

  function resumSessions(sessions) {
    const dies = uniq(sessions.map((s) => s.dia)).sort((a, b) => Number(a) - Number(b));
    const hores = uniq(sessions.map((s) => s.hora)).sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
    const franges = [];

    dies.forEach((dia) => {
      hores.forEach((hora) => {
        const total = sessions.filter((s) => s.dia === dia && s.hora === hora).length;
        if (total) franges.push({ key: franjaKey(dia, hora), dia, hora, diaLabel: diaLabel(dia), total });
      });
    });

    return {
      sessions: sessions.length,
      professors: uniq(sessions.map((s) => s.placa)).length,
      grups: uniq(sessions.map((s) => s.grup)).length,
      cursos: uniq(sessions.map((s) => s.curs)).length,
      materies: uniq(sessions.map((s) => s.materia)).length,
      activitats: comptar(sessions.map((s) => s.activitat)),
      dies,
      hores,
      franges,
    };
  }

  function parseHorariXml(text) {
    const xml = parseXmlRobust(text);
    const root = xml.documentElement;
    const rootName = (root && (root.localName || root.nodeName) || '').toUpperCase();
    if (rootName !== 'HORARI') {
      throw new Error(`Arrel XML no esperada: ${rootName || 'desconeguda'}. S'esperava HORARI.`);
    }

    const sessions = nodesPerTag(xml, 'SESSIO')
      .map(normalitzarSessio)
      .sort(ordenarSessions);

    if (!sessions.length) {
      throw new Error('No s\'han trobat sessions dins del XML.');
    }

    return {
      sessions,
      resum: resumSessions(sessions),
    };
  }

  function sessionsDeFranja(sessions, dia, hora) {
    return sessions.filter((s) => s.dia === dia && s.hora === hora);
  }

  function professorsOrdenats(sessions) {
    return uniq(sessions.map((s) => s.placa))
      .sort((a, b) => String(a).localeCompare(String(b), 'ca', { numeric: true }))
      .map((placa) => ({ placa, label: `Placa ${placa}` }));
  }

  function agruparSessionsCobertura(sessions) {
    const map = new Map();
    sessions.forEach((sessio) => {
      const key = [
        sessio.placa,
        sessio.dia,
        sessio.hora,
        sessio.materia,
        sessio.aula,
        sessio.activitat,
      ].join('|');

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          placa: sessio.placa,
          dia: sessio.dia,
          diaLabel: sessio.diaLabel,
          hora: sessio.hora,
          materia: sessio.materia,
          aula: sessio.aula,
          activitat: sessio.activitat,
          cursos: new Set(),
          grups: new Set(),
          sessions: [],
        });
      }

      const grup = map.get(key);
      if (sessio.curs) grup.cursos.add(sessio.curs);
      if (sessio.grup) grup.grups.add(sessio.grup);
      grup.sessions.push(sessio);
    });

    return Array.from(map.values()).map((item) => ({
      ...item,
      cursos: Array.from(item.cursos).sort((a, b) => a.localeCompare(b, 'ca', { numeric: true })),
      grups: Array.from(item.grups).sort((a, b) => a.localeCompare(b, 'ca', { numeric: true })),
    }));
  }

  function ocupacioFranja(sessions, dia, hora, guardiaCodes) {
    const guardies = new Set(Array.from(guardiaCodes || []).filter(Boolean));
    const perProfessor = new Map();
    professorsOrdenats(sessions).forEach((prof) => {
      perProfessor.set(prof.placa, {
        placa: prof.placa,
        label: prof.label,
        sessions: [],
        classes: [],
        guardies: [],
        activitats: [],
        lliure: true,
      });
    });

    sessionsDeFranja(sessions, dia, hora).forEach((sessio) => {
      if (!perProfessor.has(sessio.placa)) return;
      const item = perProfessor.get(sessio.placa);
      item.sessions.push(sessio);
      item.lliure = false;
      if (sessio.teClasse) item.classes.push(sessio);
      if (sessio.activitat && guardies.has(sessio.activitat)) item.guardies.push(sessio);
      else if (sessio.teActivitat) item.activitats.push(sessio);
    });

    return Array.from(perProfessor.values());
  }

  global.HorariXmlParser = {
    DIA_LABELS,
    diaLabel,
    franjaKey,
    parseHorariXml,
    sessionsDeFranja,
    professorsOrdenats,
    agruparSessionsCobertura,
    ocupacioFranja,
  };
})(window);

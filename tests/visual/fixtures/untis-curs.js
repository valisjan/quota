// Un curs petit però complet per provar l'exportació a Untis sense dades reals: quatre
// professors amb plaça, un grup de 1r ESO amb classes de cada tipus i un XML de GestIB amb
// la mateixa estructura que l'exportacioDadesHoraris del centre.

export const PROFESSORS = [
  { id: 'p-anna', nom: 'ARNAU ROS, ANNA', codiUntis: 'MAT1', departament: 'Matemàtiques', departaments: ['Matemàtiques'], jornada: '', gpAssignades: 1 },
  { id: 'p-bernat', nom: 'BOSCH PONS, BERNAT', codiUntis: 'MAT2', departament: 'Matemàtiques', departaments: ['Matemàtiques'], jornada: 'M' },
  { id: 'p-clara', nom: 'COLL VIDAL, CLARA', codiUntis: 'CAT1', departament: 'Llengua catalana', departaments: ['Llengua catalana'], jornada: '' },
  { id: 'p-david', nom: 'DURAN MAS, DAVID', codiUntis: 'TEC1', departament: 'Tecnologia', departaments: ['Tecnologia'], jornada: '' },
  // Ja no és al centre: no ha de sortir a Untis.
  { id: 'p-antic', nom: 'ANTIC, DOCENT', codiUntis: 'OLD1', departament: 'Tecnologia', eliminatDelFull: true },
];

const ANNA = 'ARNAU ROS, ANNA';
const BERNAT = 'BOSCH PONS, BERNAT';
const CLARA = 'COLL VIDAL, CLARA';
const DAVID = 'DURAN MAS, DAVID';

// gestib: la correspondència amb el catàleg de GestIB desada a la fila.
const classe = (id, camps, professors = [], gestib = null) => ({
  id,
  curs: '',
  grup: '',
  tipus: '',
  departaments: [camps.departament],
  subclasses: [],
  participants: [],
  ...camps,
  professors,
  professorAssignat: professors[0] || '',
  ...(gestib ? { gestib } : {}),
});

export const CLASSES = [
  classe('mat-a', { curs: '1ESO', grup: 'A', materia: 'Matemàtiques', hores: 4, departament: 'Matemàtiques' }, [ANNA], { tipus: 'materia', codis: ['MAT-A-1E'] }),
  classe('mat-b', { curs: '1ESO', grup: 'B', materia: 'Matemàtiques', hores: 4, departament: 'Matemàtiques' }, [BERNAT], { tipus: 'materia', codis: ['MAT-B-1E'] }),
  // Desdoblament: una de les hores de 1r A el grup es parteix i hi entra un segon professor.
  classe('mat-d', { curs: '1ESO', grup: 'A', materia: 'Matemàtiques', hores: 1, tipus: 'D', departament: 'Matemàtiques' }, [BERNAT], { tipus: 'materia', codis: ['MAT-A-1E'] }),
  classe('cat-a', { curs: '1ESO', grup: 'A', materia: 'Llengua catalana i literatura', hores: 3, departament: 'Llengua catalana' }, [CLARA], { tipus: 'materia', codis: ['LCL-A-1E'] }),
  // Sense professor: no s'exporta i surt a la revisió.
  classe('cat-b', { curs: '1ESO', grup: 'B', materia: 'Llengua catalana i literatura', hores: 3, departament: 'Llengua catalana' }, [], { tipus: 'materia', codis: ['LCL-B-1E'] }),
  classe('tec-ab', { curs: '1ESO', grup: 'A+B', materia: 'Tecnologia', hores: 2, departament: 'Tecnologia' }, [DAVID], { tipus: 'materia', codis: ['TEC-AB-1E'] }),
  // Hores de càrrec i coordinació.
  classe('cap-cat', { materia: 'Cap de departament', hores: 3, departament: 'Llengua catalana' }, [CLARA], { tipus: 'activitat', codis: ['3'] }),
  classe('coord-tic', { materia: 'Coordinació TIC', hores: 2, tipus: 'C', departament: 'Tecnologia' }, [DAVID]),
  classe('tut-a', { curs: '1ESO', materia: '*Tutoria 1ESOA', hores: 1, departament: 'Matemàtiques' }, [ANNA], { tipus: 'activitat', codis: ['62'] }),
];

export const GESTIB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CENTRE codi="PROVA001" any="2026">
  <CURSOS>
    <CURS codi="62" descripcio="1r ESO">
      <GRUP codi="1001" nom="A"/>
      <GRUP codi="1002" nom="B"/>
    </CURS>
  </CURSOS>
  <PLACES>
    <PLACA codi="1" curta="MAT1"/>
    <PLACA codi="2" curta="MAT2"/>
    <PLACA codi="3" curta="CAT1"/>
    <PLACA codi="4" curta="TEC1"/>
    <PLACA codi="5" curta="VICE" descripcio="Vicedirecció"/>
  </PLACES>
  <DEPARTAMENTS>
    <DEPARTAMENT codi="10" descripcio="Matemàtiques"/>
    <DEPARTAMENT codi="11" descripcio="Llengua catalana i literatura"/>
    <DEPARTAMENT codi="12" descripcio="Tecnologia"/>
  </DEPARTAMENTS>
  <MATERIES>
    <MATERIA codi="2001" curs="62" descripcio="Matemàtiques-A-1E" curta="MAT-A-1E" departament=""/>
    <MATERIA codi="2002" curs="62" descripcio="Matemàtiques-B-1E" curta="MAT-B-1E" departament=""/>
    <MATERIA codi="2003" curs="62" descripcio="Llengua catalana i literatura-A-1E" curta="LCL-A-1E" departament=""/>
    <MATERIA codi="2004" curs="62" descripcio="Llengua catalana i literatura-B-1E" curta="LCL-B-1E" departament=""/>
    <MATERIA codi="2005" curs="62" descripcio="Tecnologia-AB-1E" curta="TEC-AB-1E" departament=""/>
  </MATERIES>
  <ACTIVITATS>
    <ACTIVITAT codi="38" descripcio="*Assistència a CCP (IES)" curta="*Assistència a CCP"/>
    <ACTIVITAT codi="31" descripcio="Atenció a pares, mares, tutors legals o alumnes majors d'edat" curta="Atenció responsables alumnes"/>
    <ACTIVITAT codi="3" descripcio="*Dedicació a cap de departament" curta="*Dedicació al departament"/>
    <ACTIVITAT codi="18" descripcio="Guàrdia" curta="Guàrdia"/>
    <ACTIVITAT codi="30" descripcio="Guàrdia de pati" curta="Guàrdia de pati"/>
    <ACTIVITAT codi="20" descripcio="Reunió de departament" curta="Reunió departament"/>
    <ACTIVITAT codi="32" descripcio="Reunions coordinació docent" curta="Reunions coordinació docent"/>
    <ACTIVITAT codi="62" descripcio="*Tutoria" curta="*Tutoria"/>
  </ACTIVITATS>
  <AULES>
    <AULA codi="1" descripcio="Aula 1"/>
  </AULES>
</CENTRE>`;

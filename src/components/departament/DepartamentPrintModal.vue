<template>
  <div id="print-content" class="hidden">
    <div class="print-page">
      <div class="print-header">
        <h1>Assignació Horària - {{ departament }}</h1>
        <p>Data: {{ new Date().toLocaleDateString('ca-ES') }}</p>
        <div class="department-stats">
          <p><strong>Total hores:</strong> {{ totalHores }}h</p>
          <p><strong>Professors necessaris:</strong> {{ professorsNecessaris }} professors</p>
          <p><strong>Total GP:</strong> {{ totalGp }}h ({{ totalGpAssignades }}h assignades)</p>
          <p><strong>Total PALIC:</strong> {{ totalPalic }}h ({{ totalPalicAssignades }}h assignades)</p>
          <p><strong>Total suport divisible:</strong> {{ totalSd }}h ({{ totalSdAssignades }}h assignades)</p>
        </div>
      </div>

      <div class="print-section">
        <h2>Professors i Assignacions</h2>
        <div v-for="professor in professors" :key="professor.id" class="print-professor">
          <div class="professor-header">
            <h3>{{ professor.nom }}</h3>
            <div class="professor-info">
              <span class="hours-badge" :class="{
                'hours-perfect': isPerfectHours(professor.nom),
                'hours-warning': isOverRecommended(professor.nom),
                'hours-danger': isOverLimit(professor.nom)
              }">
                {{ calcularHoresProfessor(professor.nom) }} hores
              </span>
              <span v-if="getHoresGp(professor.nom) > 0" class="gp-badge">
                {{ getHoresGp(professor.nom) }} GP
              </span>
              <span v-if="getHoresPalic(professor.nom) > 0" class="palic-badge">
                {{ getHoresPalic(professor.nom) }} PALIC
              </span>
              <span v-if="getHoresSd(professor.nom) > 0" class="palic-badge">
                {{ getHoresSd(professor.nom) }} suport divisible
              </span>
              <span v-if="professor.preferencia" class="preference-badge">
                {{ professor.preferencia === 'pronto' ? 'Entrar prest' : 'Entrar tard' }}
              </span>
            </div>
          </div>
          
          <div class="classes-list">
            <div v-for="classe in getClassesProfessor(professor.nom)" :key="classe.id" class="class-item">
              <span class="class-name">{{ classe.materia }}</span>
              <span class="class-details">{{ classe.curs }} {{ classe.grup }}</span>
              <span class="class-hours">{{ classe.hores }}h</span>
            </div>
            <div
              v-for="(sd, index) in getSdAssignacions(professor.nom)"
              :key="`sd-${professor.id}-${index}`"
              class="class-item"
            >
              <span class="class-name">Suport divisible</span>
              <span class="class-details">{{ sd.grup || 'Sense grup indicat' }}</span>
              <span class="class-hours">1h</span>
            </div>
          </div>
          
          <div v-if="professor.comentaris" class="professor-comments">
            <strong>Comentaris:</strong> {{ professor.comentaris }}
          </div>
        </div>
      </div>

      <div class="print-section">
        <h2>Resum de Classes</h2>
        
        <table class="classes-table">
          <thead>
            <tr>
              <th>Curs</th>
              <th>Grup</th>
              <th>Matèria</th>
              <th>Tipus</th>
              <th>Hores</th>
              <th>Professor</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="classe in classes" :key="classe.id">
              <td>{{ classe.curs }}</td>
              <td>{{ classe.grup }}</td>
              <td>{{ classe.materia }}</td>
              <td>{{ classe.tipus || '-' }}</td>
              <td>{{ classe.hores }}h</td>
              <td>{{ formatProfessorsClasse(classe) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  departament: {
    type: String,
    required: true
  },
  professors: {
    type: Array,
    default: () => []
  },
  classes: {
    type: Array,
    default: () => []
  },
  totalHores: {
    type: Number,
    default: 0
  },
  professorsNecessaris: {
    type: String,
    default: '0'
  },
  totalGp: {
    type: Number,
    default: 0
  },
  totalGpAssignades: {
    type: Number,
    default: 0
  },
  totalPalic: {
    type: Number,
    default: 0
  },
  totalPalicAssignades: {
    type: Number,
    default: 0
  },
  totalSd: {
    type: Number,
    default: 0
  },
  totalSdAssignades: {
    type: Number,
    default: 0
  },
  getClassesProfessor: {
    type: Function,
    required: true
  },
  calcularHoresProfessor: {
    type: Function,
    required: true
  },
  getHoresGp: {
    type: Function,
    required: true
  },
  getHoresPalic: {
    type: Function,
    required: true
  },
  getHoresSd: {
    type: Function,
    required: true
  },
  getSdAssignacions: {
    type: Function,
    required: true
  },
  isPerfectHours: {
    type: Function,
    required: true
  },
  isOverRecommended: {
    type: Function,
    required: true
  },
  isOverLimit: {
    type: Function,
    required: true
  }
});

function formatProfessorsClasse(classe) {
  const professors = Array.isArray(classe.professors) && classe.professors.length > 0
    ? classe.professors.filter(Boolean)
    : [classe.professorAssignat].filter(Boolean);

  return professors.length ? professors.join(', ') : 'Sense assignar';
}
</script>

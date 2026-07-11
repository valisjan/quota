<template>
  <div class="sections space-y-5">
    <AdminSectionNav v-model="activeSection" :items="sectionItems" mode="panels" />

    <!-- Header card -->
    <div v-show="activeSection === 'flux-untis' || activeSection === 'correspondencies-gestib'" id="flux-untis" class="admin-anchor-section card p-5">
      <div v-show="activeSection === 'flux-untis'">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="text-xl font-bold text-slate-950">
              Flux de treball Untis
            </h3>
            <p class="mt-2 text-base text-slate-700 dark:text-slate-300">
              Carrega l'XML de GestIB a Untis i usa aquesta pantalla per generar
              el GPU002.TXT amb professor, matèria, grup i hores.
            </p>
          </div>
          <button
            @click="generar"
            :disabled="carregant || !referenciaGestibXmlText"
            class="rounded-md bg-primary px-5 py-3 text-base font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
          >
            {{ carregant ? 'Generant...' : 'Genera GPU002' }}
          </button>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-5">
          <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/20 dark:bg-primary/10">
            <p class="text-xs font-medium text-primary/70">1. GestIB</p>
            <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">Descarregar XML</p>
          </div>
          <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/20 dark:bg-primary/10">
            <p class="text-xs font-medium text-primary/70">2. App</p>
            <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">Carregar XML</p>
          </div>
          <div class="rounded-lg border border-primary/20 bg-primary/5 p-3 dark:border-primary/20 dark:bg-primary/10">
            <p class="text-xs font-medium text-primary/70">3. App</p>
            <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">Generar GPU002</p>
          </div>
          <div class="rounded-lg border border-success/20 bg-success/5 p-3 dark:border-success/20 dark:bg-success/10">
            <p class="text-xs font-medium text-success/70">4. Baixar</p>
            <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">GPU002.TXT</p>
          </div>
          <div class="rounded-lg border border-success/20 bg-success/5 p-3 dark:border-success/20 dark:bg-success/10">
            <p class="text-xs font-medium text-success/70">5. Untis</p>
            <p class="mt-1 text-sm font-bold text-slate-950 dark:text-white">Importar fitxer</p>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900">
            <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              XML de GestIB <span class="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              :disabled="carregantXmlRemot || pujantXmlRemot"
              class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-primary file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-primary-dark dark:text-slate-300 dark:file:bg-primary-dark"
              @change="carregarGestibXml"
            />
            <p class="mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span v-if="carregantXmlRemot">Carregant l'XML desat...</span>
              <span v-else-if="pujantXmlRemot">Desant l'XML...</span>
              <span v-else-if="gestibXmlNom">{{ gestibXmlNom }}</span>
              <span v-else>exportacioDadesHoraris de GestIB</span>
            </p>
            <p
              v-if="gestibXmlRemot"
              data-testid="gestib-remote-status"
              class="mt-1 text-xs font-medium text-green-700 dark:text-green-400"
            >
              Desat remotament<span v-if="gestibXmlRemot.actualitzat"> · {{ formatDataXmlRemot(gestibXmlRemot.actualitzat) }}</span>
            </p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900">
            <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
              GPU002.TXT de referència
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-primary file:bg-slate-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700 dark:text-slate-300 dark:file:bg-slate-500"
              @change="carregarGpu002Referencia"
            />
            <p class="mt-2 text-xs text-slate-600 dark:text-slate-400">
              <span v-if="gpu002ReferenciaNom">{{ gpu002ReferenciaNom }}</span>
              <span v-else>GPU002 anterior (opcional, per numeració i resolució automàtica)</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Mapeig manual de matèries -->
      <div v-if="analitzant && activeSection === 'correspondencies-gestib'" class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Analitzant mapeig GestIB...
      </div>

      <div
        v-else-if="totes.length > 0"
        v-show="activeSection === 'correspondencies-gestib'"
        id="correspondencies-gestib"
        class="mt-4 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900"
      >
        <div class="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-bold text-slate-950 dark:text-white">
              Mapeig GestIB
              <span
                v-if="pendentsCount > 0"
                class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300"
              >{{ pendentsCount }} pendents</span>
            </p>
            <div class="mt-0.5 flex items-center gap-3">
              <p class="text-xs text-slate-600 dark:text-slate-400">
                Selecciona la matèria de GestIB per a les pendents. Es guarda automàticament.
              </p>
              <button
                @click="confirmarEsborra = true"
                class="shrink-0 text-xs text-red-500 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
              >Esborra mapeig</button>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              v-for="tab in [{ valor: 'totes', etiqueta: 'Totes', count: totes.length }, { valor: 'resoltes', etiqueta: 'Resoltes', count: resoltesCount }, { valor: 'pendents', etiqueta: 'Pendents', count: pendentsCount }]"
              :key="tab.valor"
              @click="filtreMapateg = tab.valor"
              class="rounded px-2.5 py-1 text-xs font-medium transition"
              :class="filtreMapateg === tab.valor
                ? (tab.valor === 'pendents' && pendentsCount > 0 ? 'bg-amber-500 text-white' : 'bg-primary text-white')
                : (tab.valor === 'pendents' && pendentsCount > 0
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')"
            >
              {{ tab.etiqueta }}
              <span class="ml-1 opacity-80">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="m in classesFiltrades"
            :key="m.clau"
            class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span
              class="shrink-0 self-start rounded px-1.5 py-0.5 text-xs font-semibold sm:self-auto"
              :class="estatMapeigBadgeClass(m)"
            >{{ estatMapeigEtiqueta(m) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-slate-950 dark:text-white">{{ m.materia }}</p>
              <p class="text-xs text-slate-600 dark:text-slate-400">
                <span v-if="m.curs">{{ m.curs }}</span>
                <span v-if="m.grup" class="ml-1 font-medium text-slate-700 dark:text-slate-300">· {{ m.grup }}</span>
                <span v-else-if="m.senseAmbdos" class="ml-1 italic text-amber-800 dark:text-amber-400">· sense curs i grup</span>
                <span v-else-if="!m.grup" class="ml-1 italic text-amber-800 dark:text-amber-400">· sense grup</span>
              </p>
            </div>
            <div class="flex w-full items-center gap-2 sm:w-96">
              <SelectBuscador
                :modelValue="codiActualMapeig(m)"
                :opcions="opcionsPerClau(m)"
                placeholder="Cerca matèria de GestIB..."
                class="flex-1"
                @update:modelValue="assignarOverride(m.clau, $event)"
              />
              <span
                v-if="codiActualMapeig(m)"
                class="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400"
              >&#10003;</span>
            </div>
          </div>
          <p v-if="classesFiltrades.length === 0" class="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-500">
            <span v-if="filtreMapateg === 'pendents'">Totes les classes estan resoltes</span>
            <span v-else>Cap resultat</span>
          </p>
        </div>
      </div>

    </div>

    <!-- Mode simulació -->
    <section v-show="activeSection === 'mode-simulacio'" id="mode-simulacio" class="admin-anchor-section rounded-lg border border-amber-300 bg-amber-50 p-5" style="box-shadow:0 0 0 1px rgba(217,119,6,0.20),0 8px 24px 0 rgba(217,119,6,0.18)">
      <div class="mb-3 flex items-center gap-2">
        <span class="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white">!</span>
        <h3 class="text-sm font-bold uppercase tracking-wide text-amber-900">Mode simulació</h3>
      </div>
      <label class="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          v-model="simular"
          class="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 accent-amber-600"
        />
        <span class="text-sm text-amber-800">
          Assigna codis de les places de l'XML a totes les classes exportables, <strong>sense guardar res a Firestore</strong>. Activa'l per verificar la generació abans d'aplicar els canvis.
        </span>
      </label>
    </section>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- CCP caps departament -->
    <section
      v-if="exportacio?.ccp"
      v-show="activeSection === 'ccp-caps'"
      id="ccp-caps"
      class="admin-anchor-section card overflow-hidden"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 class="text-xl font-bold text-slate-950 dark:text-white">Assistència a CCP</h4>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              La CCP s'exporta com una lliçó lectiva sense grup ni matèria a GPU002. La mateixa hora es resta de la dedicació de cap de departament.
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Entren a CCP els caps de departaments amb 2 membres o més, excepte Economia, quan tenen 2h de dedicació: 1h CCP i 1h cap.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-md bg-violet-100 px-2.5 py-1 text-sm font-bold text-violet-800 dark:bg-violet-900/30 dark:text-violet-200">
              {{ exportacio.ccp.totalAssistents || 0 }} assistents
            </span>
            <span class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.ccp.descripcio }}
            </span>
            <span v-if="exportacio.ccp.codiActivitat" class="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.ccp.codiActivitat }}
            </span>
          </div>
        </div>

        <div v-if="exportacio.ccp.simulacio" class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          En mode simulació no es genera la CCP perquè els professors es substitueixen per places del XML. Genera sense simulació per veure el repartiment real.
        </div>

        <div v-else class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Caps detectats</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ exportacio.ccp.totalCaps }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Hores CCP</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ formatHoresUntis(exportacio.ccp.totalHoresCcp) }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Hores cap exportades</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ formatHoresUntis(exportacio.ccp.totalHoresCapExport) }}</p>
          </div>
        </div>
      </div>

      <div v-if="!exportacio.ccp.simulacio" class="overflow-auto">
        <table class="w-full min-w-[860px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-gray-900">
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Departament</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Cap</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Membres</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Hores originals</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">CCP</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Cap export</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Estat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="cap in ccpCapsOrdenats"
              :key="`${cap.departament}-${cap.professor}`"
              class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
            >
              <td class="px-3 py-3 font-semibold text-slate-900 dark:text-white">{{ cap.departament || '-' }}</td>
              <td class="px-3 py-3 text-slate-800 dark:text-slate-200">{{ cap.professor || '-' }}</td>
              <td class="px-3 py-3 text-center font-mono text-slate-900 dark:text-white">{{ cap.membres }}</td>
              <td class="px-3 py-3 text-center font-mono text-slate-900 dark:text-white">{{ formatHoresUntis(cap.horesOriginals) }}</td>
              <td class="px-3 py-3 text-center font-mono font-bold" :class="cap.horesCcp ? 'text-violet-800 dark:text-violet-200' : 'text-slate-400'">
                {{ cap.horesCcp ? formatHoresUntis(cap.horesCcp) : '-' }}
              </td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">{{ formatHoresUntis(cap.horesCapExport) }}</td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-xs font-bold"
                  :class="cap.elegible
                    ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-slate-300'"
                >
                  {{ cap.elegible ? 'Va a la CCP' : cap.motiu || 'No CCP' }}
                </span>
              </td>
            </tr>
            <tr v-if="ccpCapsOrdenats.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                No s'han detectat classes de cap de departament.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Atencio families -->
    <section
      v-if="exportacio?.atencioFamilies"
      v-show="activeSection === 'atencio-families'"
      id="atencio-families"
      class="admin-anchor-section card overflow-hidden"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 class="text-xl font-bold text-slate-950 dark:text-white">Atenció a famílies</h4>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Es crea una lliçó complementària independent a GPU002 per a cada professor, sense grup ni matèria, amb la descripció del XML.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-md bg-emerald-100 px-2.5 py-1 text-sm font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              {{ exportacio.atencioFamilies.totalProfessors || 0 }} professors
            </span>
            <span class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.atencioFamilies.descripcio }}
            </span>
            <span v-if="exportacio.atencioFamilies.codiActivitat" class="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.atencioFamilies.codiActivitat }}
            </span>
          </div>
        </div>

        <div v-if="exportacio.atencioFamilies.simulacio" class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          En mode simulació no es genera aquesta activitat perquè els professors se substitueixen per places del XML.
        </div>

        <div v-else class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Hores per professor</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ formatHoresUntis(exportacio.atencioFamilies.horesPerProfessor || 1) }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Línies GPU002</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ exportacio.atencioFamilies.totalLinies || 0 }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipus</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">COM</p>
          </div>
        </div>
      </div>

      <div v-if="!exportacio.atencioFamilies.simulacio" class="max-h-[360px] overflow-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-gray-900">
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professor</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Departament</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Codi</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Hores</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="professor in atencioFamiliesProfessorsOrdenats"
              :key="professor.nom"
              class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
            >
              <td class="px-3 py-3 font-semibold text-slate-900 dark:text-white">{{ professor.nom }}</td>
              <td class="px-3 py-3 text-slate-800 dark:text-slate-200">{{ professor.departament || '-' }}</td>
              <td class="px-3 py-3 font-mono text-slate-700 dark:text-slate-300">{{ professor.codiUntis || '-' }}</td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">{{ formatHoresUntis(exportacio.atencioFamilies.horesPerProfessor || 1) }}</td>
            </tr>
            <tr v-if="atencioFamiliesProfessorsOrdenats.length === 0">
              <td colspan="4" class="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                No s'han detectat professors exportables.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Reunions departament -->
    <section
      v-if="exportacio?.reunionsDepartament"
      v-show="activeSection === 'reunions-departament'"
      id="reunions-departament"
      class="admin-anchor-section card overflow-hidden"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 class="text-xl font-bold text-slate-950 dark:text-white">Reunions de departament</h4>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Es crea una lliçó complementària per departament a GPU002, sense grup ni matèria, amb tot el professorat del departament dins la mateixa reunió.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-md bg-cyan-100 px-2.5 py-1 text-sm font-bold text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200">
              {{ exportacio.reunionsDepartament.totalDepartaments || 0 }} departaments
            </span>
            <span class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.reunionsDepartament.descripcio }}
            </span>
            <span v-if="exportacio.reunionsDepartament.codiActivitat" class="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.reunionsDepartament.codiActivitat }}
            </span>
          </div>
        </div>

        <div v-if="exportacio.reunionsDepartament.simulacio" class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          En mode simulació no es generen les reunions de departament perquè els professors se substitueixen per places del XML.
        </div>

        <div v-else class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Hores per departament</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ formatHoresUntis(exportacio.reunionsDepartament.horesPerDepartament || 1) }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Línies GPU002</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ exportacio.reunionsDepartament.totalLinies || 0 }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Tipus</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">COM</p>
          </div>
        </div>
      </div>

      <div v-if="!exportacio.reunionsDepartament.simulacio" class="overflow-auto">
        <table class="w-full min-w-[900px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-gray-900">
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Departament</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Prof.</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professorat inclòs</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="reunio in reunionsDepartamentOrdenades"
              :key="reunio.departament"
              class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
            >
              <td class="px-3 py-3 font-semibold text-slate-900 dark:text-white">{{ reunio.departament }}</td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">{{ reunio.professors.length }}</td>
              <td class="px-3 py-3 text-slate-700 dark:text-slate-300">
                {{ reunio.professors.map((professor) => professor.nom).join(', ') }}
              </td>
            </tr>
            <tr v-if="reunionsDepartamentOrdenades.length === 0">
              <td colspan="3" class="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                No s'han detectat departaments exportables.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Reunions coordinacio docent -->
    <section
      v-if="exportacio?.reunionsCoordinacio"
      v-show="activeSection === 'reunions-docents'"
      id="reunions-docents"
      class="admin-anchor-section card overflow-hidden"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 class="text-xl font-bold text-slate-950 dark:text-white">Reunions de coordinació docent</h4>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Es creen a GPU002 com a activitat sense grup ni matèria, amb la descripció de coordinació docent del XML. Només 1r, 2n i 3r ESO.
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Els equips es formen per ACE/BDF o AC/BD; s'exclouen Taller de lectura i optatives.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="rounded-md bg-blue-100 px-2.5 py-1 text-sm font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              {{ exportacio.reunionsCoordinacio.totalReunions || 0 }} reunions
            </span>
            <span class="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.reunionsCoordinacio.descripcio }}
            </span>
            <span v-if="exportacio.reunionsCoordinacio.codiActivitat" class="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-sm font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">
              {{ exportacio.reunionsCoordinacio.codiActivitat }}
            </span>
          </div>
        </div>

        <div v-if="exportacio.reunionsCoordinacio.simulacio" class="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          En mode simulació es mostra el càlcul dels equips, però les reunions no s'afegeixen al GPU002 perquè els professors se substitueixen per places del XML.
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Equips detectats</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ exportacio.reunionsCoordinacio.totalEquips }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Línies GPU002</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ exportacio.reunionsCoordinacio.totalLinies }}</p>
          </div>
          <div class="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Exclusions</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ reunionsCoordinacioExclosos.length }}</p>
          </div>
        </div>
      </div>

      <div class="overflow-auto">
        <table class="w-full min-w-[1040px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-gray-900">
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Equip</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Grups</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Prof.</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professorat inclòs</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Classes</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Mostra de classes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="equip in reunionsCoordinacioOrdenades"
              :key="equip.clau"
              class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
            >
              <td class="px-3 py-3">
                <div class="font-mono text-base font-bold text-slate-950 dark:text-white">{{ equip.etiqueta }}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">{{ equip.curs }}</div>
              </td>
              <td class="px-3 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">{{ equip.grups.join(' + ') }}</td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-950 dark:text-white">{{ equip.professors.length }}</td>
              <td class="px-3 py-3">
                <div class="flex max-w-xl flex-wrap gap-1.5">
                  <span
                    v-for="professor in equip.professors"
                    :key="`${equip.clau}-${professor}`"
                    class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200"
                  >
                    {{ professor }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-950 dark:text-white">{{ equip.classesIncloses.length }}</td>
              <td class="px-3 py-3">
                <div class="max-h-24 space-y-1 overflow-auto pr-1">
                  <div
                    v-for="classe in equip.classesIncloses.slice(0, 12)"
                    :key="`${equip.clau}-${classe.curs}-${classe.grup}-${classe.materia}`"
                    class="rounded bg-white px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-100 dark:bg-gray-950 dark:text-slate-300 dark:ring-slate-800"
                  >
                    <span class="font-mono font-semibold">{{ classe.curs }} {{ classe.grup }}</span>
                    · {{ classe.materia }}
                    <span v-if="classe.tipus">· {{ classe.tipus }}</span>
                  </div>
                  <div v-if="equip.classesIncloses.length > 12" class="text-xs font-semibold text-slate-500">
                    + {{ equip.classesIncloses.length - 12 }} més
                  </div>
                </div>
              </td>
            </tr>
            <tr v-if="reunionsCoordinacioOrdenades.length === 0">
              <td colspan="6" class="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                No s'han detectat equips docents exportables.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="reunionsCoordinacioExclosos.length" class="border-t border-slate-200 p-5 dark:border-slate-700">
        <h5 class="text-sm font-bold text-slate-950 dark:text-white">Classes excloses del càlcul</h5>
        <div class="mt-3 max-h-56 overflow-auto rounded-md border border-slate-200 dark:border-slate-700">
          <table class="w-full min-w-[720px] text-xs">
            <thead>
              <tr class="bg-slate-50 text-left dark:bg-gray-900">
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Classe</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Matèria</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professorat</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Motiu</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="(classe, index) in reunionsCoordinacioExclosos" :key="index">
                <td class="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{{ classe.curs }} {{ classe.grup }}</td>
                <td class="px-3 py-2 text-slate-700 dark:text-slate-300">{{ classe.materia }}</td>
                <td class="px-3 py-2 text-slate-600 dark:text-slate-400">{{ classe.professorat.join(', ') || '-' }}</td>
                <td class="px-3 py-2">
                  <span class="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 dark:bg-gray-800 dark:text-slate-200">{{ classe.motiu }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Previsualitzacio Untis -->
    <div
      v-if="exportacio"
      v-show="activeSection === 'previsualitzacio-untis'"
      id="previsualitzacio-untis"
      class="admin-anchor-section card"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xl font-bold text-slate-950 dark:text-white">
                Previsualitzacio Untis
              </h4>
              <span
                v-if="simular"
                class="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
              >
                Simulacio
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Revisa numero de classe, bloc, professor, materia, grup i hores abans de descarregar el GPU002.
            </p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
            <input
              v-model="filtreVistaPrevia"
              type="search"
              class="form-input w-full bg-white py-2 text-sm dark:bg-gray-900 xl:w-80"
              placeholder="Filtra per grup, materia, professor o codi"
            />
            <button
              @click="descarregarGpu002"
              class="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
            >
              Descarrega GPU002
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Llicons</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ vistaPreviaStats.total }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Linies GPU002</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ vistaPreviaStats.linies }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Blocs multiples</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ vistaPreviaStats.multiLinia }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Activitats</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ vistaPreviaStats.activitats }}</p>
          </div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">Numeracio ref.</p>
            <p class="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{{ vistaPreviaStats.referencia }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="filtre in filtresVistaPrevia"
            :key="filtre.valor"
            type="button"
            class="rounded-md px-3 py-1.5 text-xs font-semibold transition"
            :class="filtreVistaPreviaMode === filtre.valor
              ? 'bg-primary text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-gray-800 dark:text-slate-300 dark:hover:bg-gray-700'"
            @click="filtreVistaPreviaMode = filtre.valor"
          >
            {{ filtre.etiqueta }}
            <span class="ml-1 opacity-80">{{ countVistaPreviaFiltre(filtre.valor) }}</span>
          </button>
        </div>
      </div>

      <div class="overflow-auto">
        <table class="w-full min-w-[1120px] text-sm">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50 text-left dark:border-slate-700 dark:bg-gray-900">
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Num.</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Bloc</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Grup</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Materia</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professorat</th>
              <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Hores</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Linies que importara Untis</th>
              <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Origen</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr
              v-for="item in vistaPreviaFiltrada"
              :key="item.numero"
              class="align-top transition-colors hover:bg-slate-50 dark:hover:bg-gray-900/60"
              :class="previsualitzacioRowClass(item)"
            >
              <td class="px-3 py-3">
                <div class="font-mono text-base font-bold text-slate-950 dark:text-white">{{ item.numero }}</div>
                <div v-if="item.linies > 1" class="mt-1 text-xs font-semibold text-primary dark:text-blue-300">
                  {{ item.linies }} linies
                </div>
              </td>
              <td class="px-3 py-3">
                <span class="inline-flex rounded-md px-2 py-1 text-xs font-bold" :class="blocBadgeClass(item)">
                  {{ item.bloc || 'Ordinaria' }}
                </span>
                <div v-if="item.tipus" class="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {{ item.tipus }}
                </div>
              </td>
              <td class="px-3 py-3">
                <div class="font-mono font-bold text-slate-950 dark:text-white">{{ item.codiGrups || '-' }}</div>
                <div class="text-xs text-slate-600 dark:text-slate-400">{{ [item.curs, item.grup].filter(Boolean).join(' ') || 'Sense grup' }}</div>
              </td>
              <td class="px-3 py-3">
                <div class="font-semibold text-slate-900 dark:text-white">{{ item.materia }}</div>
                <div class="mt-1 font-mono text-xs text-slate-600 dark:text-slate-400">{{ item.codiMateria }}</div>
                <div v-if="item.notes?.length" class="mt-2 flex flex-wrap gap-1">
                  <span
                    v-for="nota in item.notes"
                    :key="nota"
                    class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-gray-800 dark:text-slate-300"
                  >
                    {{ nota }}
                  </span>
                </div>
              </td>
              <td class="px-3 py-3">
                <div v-for="professor in item.professors" :key="professor" class="text-slate-800 dark:text-slate-200">
                  {{ professor }}
                </div>
                <div class="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                  {{ item.codisProfessors.join(' + ') }}
                </div>
              </td>
              <td class="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                {{ formatHoresUntis(item.hores) }}
              </td>
              <td class="px-3 py-3">
                <div class="space-y-1.5">
                  <div
                    v-for="linia in item.liniesUntis"
                    :key="`${item.numero}-${linia.codiGrup}-${linia.codiProfessor}-${linia.codiMateria}`"
                    class="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-gray-950"
                  >
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span class="font-mono font-bold text-slate-900 dark:text-white">{{ linia.codiGrup || 'ACT' }}</span>
                      <span class="font-mono text-slate-700 dark:text-slate-300">{{ linia.codiProfessor }}</span>
                      <span class="font-mono text-slate-700 dark:text-slate-300">{{ linia.codiMateria }}</span>
                      <span class="text-slate-600 dark:text-slate-400">{{ linia.professor }}</span>
                    </div>
                    <div class="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Prof: {{ formatHoresUntis(linia.horesProfessor) }}</span>
                      <span>Grup: {{ linia.horesGrup ? formatHoresUntis(linia.horesGrup) : '-' }}</span>
                      <span v-if="linia.aula">Aula: {{ linia.aula }}</span>
                      <span>ID: {{ linia.idUntis }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-3 py-3">
                <span
                  class="rounded px-2 py-1 text-xs font-bold"
                  :class="item.font === 'referencia'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200'"
                >
                  {{ item.font === 'referencia' ? 'Referencia' : 'Generat' }}
                </span>
              </td>
            </tr>
            <tr v-if="vistaPreviaFiltrada.length === 0">
              <td colspan="8" class="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                Cap llico coincideix amb el filtre.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Generated files -->
    <div
      v-if="exportacio"
      v-show="activeSection === 'fitxers-preparats'"
      id="fitxers-preparats"
      class="card"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xl font-bold text-slate-950">
                Fitxers preparats
              </h4>
              <span
                v-if="simular"
                class="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
              >
                SIMULACIÓ
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ exportacio.totals.professors }} professors ·
              {{ exportacio.totals.classes }} grups ·
              {{ exportacio.totals.materies }} matèries ·
              {{ exportacio.totals.llicons }} lliçons
              <span v-if="exportacio.totals.simulades"> · {{ exportacio.totals.simulades }} simulades</span>
            </p>
            <p v-if="gestibXmlNom || gpu002ReferenciaNom" class="mt-1 text-sm font-medium text-slate-700 dark:text-slate-400">
              {{ [gestibXmlNom && `GestIB: ${gestibXmlNom}`, gpu002ReferenciaNom && `GPU002: ${gpu002ReferenciaNom}`].filter(Boolean).join(' · ') }}
            </p>
            <p v-if="exportacio.referenciaGestibStats" class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              XML GestIB: {{ exportacio.referenciaGestibStats.materies }} matèries ·
              {{ exportacio.referenciaGestibStats.places }} places ·
              {{ exportacio.referenciaGestibStats.aules }} aules
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row">
            <button
              @click="obrirPrevisualitzacio"
              class="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
            >
              Obre previsualitzacio
            </button>
            <button
              @click="descarregarTots"
              class="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-white"
            >
              Descarrega tots
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="false && mostrarVistaPrevia && exportacio.vistaPrevia?.length"
        class="border-b border-slate-200 p-5 dark:border-slate-700"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h5 class="text-lg font-semibold text-slate-950">
              Vista prèvia de lliçons
            </h5>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ vistaPreviaFiltrada.length }} de {{ exportacio.vistaPrevia.length }} lliçons preparades per importar.
            </p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              v-model="filtreVistaPrevia"
              type="search"
              class="form-input w-full bg-white py-2 text-sm dark:bg-gray-900 lg:w-80"
              placeholder="Filtra per grup, matèria o professor"
            />
            <button
              @click="descarregarGpu002"
              class="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
            >
              Descarrega ara
            </button>
          </div>
        </div>

        <div class="mt-4 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full min-w-[860px] text-sm">
            <thead>
              <tr class="bg-slate-50 text-left dark:bg-gray-900">
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">#</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Grup</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Matèria</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-700 dark:text-slate-300">Hores</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Professors</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Codis Untis</th>
                <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-300">Origen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="item in vistaPreviaFiltrada"
                :key="item.numero"
                class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
              >
                <td class="px-3 py-2 font-mono text-slate-600">{{ item.numero }}</td>
                <td class="px-3 py-2">
                  <div class="font-mono font-bold text-slate-950 dark:text-white">
                    {{ item.codiGrups }}
                  </div>
                  <div class="text-xs text-slate-600 dark:text-slate-400">
                    {{ item.curs }} {{ item.grup }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <div class="font-medium text-slate-900 dark:text-white">{{ item.materia }}</div>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-if="item.tipus"
                      class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {{ item.tipus }}
                    </span>
                  </div>
                  <div v-if="item.filesAgrupades.length > 1" class="mt-2 space-y-1">
                    <div
                      v-for="(fila, index) in item.filesAgrupades"
                      :key="index"
                      class="rounded bg-slate-50 px-2 py-1 text-xs text-slate-700 dark:bg-gray-900 dark:text-slate-300"
                    >
                      {{ fila.curs }} {{ fila.grup }} · {{ fila.materia }} · {{ fila.hores }}h
                      <span v-if="fila.tipus">· {{ fila.tipus }}</span>
                      <span v-if="fila.professor">· {{ fila.professor }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                  {{ item.hores }}
                </td>
                <td class="px-3 py-2">
                  <div class="space-y-1">
                    <div
                      v-for="professor in item.professors"
                      :key="professor"
                      class="text-slate-800 dark:text-slate-200"
                    >
                      {{ professor }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                  <div>{{ item.codiMateria }}</div>
                  <div>{{ item.codisProfessors.join(' + ') }}</div>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="rounded px-2 py-1 text-xs font-bold"
                    :class="item.font === 'referencia'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200'"
                  >
                    {{ item.font === 'referencia' ? 'Referència' : 'Generat' }}
                  </span>
                </td>
              </tr>
              <tr v-if="vistaPreviaFiltrada.length === 0">
                <td colspan="7" class="px-3 py-6 text-center text-slate-500 dark:text-slate-500">
                  Cap lliço coincideix amb el filtre.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <div
          v-for="fitxer in exportacio.fitxers"
          :key="fitxer.nom"
          class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-mono text-base font-bold text-slate-950 dark:text-white">
              {{ fitxer.nom }}
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {{ fitxer.descripcio }}
            </p>
          </div>
          <button
            @click="descarregar(fitxer)"
            class="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-white"
          >
            Descarrega
          </button>
        </div>
      </div>
    </div>

    <!-- Pending review -->
    <div
      v-if="exportacio?.pendents?.length"
      v-show="activeSection === 'pendents-revisar'"
      id="pendents-revisar"
      class="rounded-lg border border-orange-200 bg-orange-50 p-5"
    >
      <h4 class="text-lg font-bold text-slate-950">
        Pendents de revisar: {{ exportacio.pendents.length }}
      </h4>
      <div class="mt-3 max-h-80 space-y-2 overflow-auto pr-2">
        <div
          v-for="(pendent, index) in exportacio.pendents"
          :key="index"
          class="rounded-lg bg-white p-3 text-sm text-orange-900 shadow-sm dark:bg-gray-900 dark:text-orange-200"
        >
          <p class="font-semibold">{{ pendent.motiu }}</p>
          <p class="mt-1 text-orange-800 dark:text-orange-300">
            {{ resumClasse(pendent.classe) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Comparador GPU002 -->
    <div v-show="activeSection === 'comparador-gpu'" id="comparador-gpu" class="admin-anchor-section card">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h4 class="text-xl font-bold text-slate-950">
          Comparador amb GPU002.TXT
        </h4>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Compara les dades de l'app amb un GPU002.TXT existent d'Untis.
        </p>
      </div>

      <div class="p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              GPU002.TXT per comparar
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-primary file:bg-slate-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700 dark:text-slate-300 dark:file:bg-slate-600"
              @change="carregarGpu002Comparar"
            />
            <p v-if="gpu002ComparacioNom" class="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {{ gpu002ComparacioNom }}
            </p>
          </div>
          <button
            @click="comparar"
            :disabled="!gpu002ComparacioText || comparacioCarregant"
            class="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {{ comparacioCarregant ? 'Comparant...' : 'Comparar' }}
          </button>
        </div>

        <div v-if="comparacioError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {{ comparacioError }}
        </div>

        <!-- Results -->
        <template v-if="comparacio">
          <!-- Summary stats -->
          <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-gray-900">
              <div class="text-xl font-extrabold text-slate-800 dark:text-slate-100">{{ comparacio.resum.total }}</div>
              <div class="text-xs font-medium text-slate-600 dark:text-slate-400">Total GPU002</div>
            </div>
            <div class="rounded-lg bg-success/10 p-3 text-center dark:bg-success/5">
              <div class="text-xl font-extrabold text-[#007820] dark:text-success">{{ comparacio.resum.ok }}</div>
              <div class="text-xs font-medium text-[#007820] dark:text-success">Coincideix</div>
            </div>
            <div class="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/20">
              <div class="text-xl font-extrabold text-blue-700 dark:text-blue-300">{{ comparacio.resum.diferentProf }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400">Prof diferent</div>
            </div>
            <div class="rounded-lg bg-danger/10 p-3 text-center dark:bg-danger/5">
              <div class="text-xl font-extrabold text-danger-dark dark:text-danger">{{ comparacio.resum.noTrobat }}</div>
              <div class="text-xs font-medium text-danger-dark dark:text-danger">No a l'app</div>
            </div>
            <div class="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/20">
              <div class="text-xl font-extrabold text-amber-900 dark:text-amber-300">{{ comparacio.resum.diferentHores }}</div>
              <div class="text-xs font-medium text-amber-800 dark:text-amber-400">Hores diferents</div>
            </div>
            <div class="rounded-lg bg-orange-50 p-3 text-center dark:bg-orange-950/20">
              <div class="text-xl font-extrabold text-orange-700 dark:text-orange-300">{{ comparacio.resum.senseProfGpu }}</div>
              <div class="text-xs font-medium text-orange-600 dark:text-orange-400">Sense prof GPU</div>
            </div>
            <div class="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950/20">
              <div class="text-xl font-extrabold text-purple-700 dark:text-purple-300">{{ comparacio.resum.senseProfApp }}</div>
              <div class="text-xs font-medium text-purple-600 dark:text-purple-400">Sense prof App</div>
            </div>
            <div class="rounded-lg bg-rose-50 p-3 text-center dark:bg-rose-950/20">
              <div class="text-xl font-extrabold text-rose-700 dark:text-rose-300">{{ comparacio.resum.senseEntrada }}</div>
              <div class="text-xs font-medium text-rose-600 dark:text-rose-400">No al GPU002</div>
            </div>
          </div>

          <!-- Filter buttons -->
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="f in filtres"
              :key="f.valor"
              @click="filtreActiu = f.valor"
              :class="[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                filtreActiu === f.valor
                  ? 'bg-primary text-white dark:bg-primary-dark'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
              ]"
            >
              {{ f.etiqueta }} ({{ f.valor === 'tots' ? comparacio.entrades.length : comparacio.entrades.filter((e) => e.estat === f.valor).length }})
            </button>
          </div>

          <!-- Comparison table -->
          <div class="mt-3 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full min-w-[640px] text-xs">
              <thead>
                <tr class="bg-slate-50 text-left dark:bg-gray-900">
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">#</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Classe GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Matèria GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Prof GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Classe App</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Prof App</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">H</th>
                  <th class="px-3 py-2 font-semibold text-slate-700 dark:text-slate-400">Estat</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  v-for="entrada in entradesFiltrades"
                  :key="entrada.num"
                  :class="estatRowClass(entrada.estat)"
                >
                  <td class="px-3 py-2 font-mono text-slate-600">{{ entrada.num }}</td>
                  <td class="px-3 py-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{{ entrada.classeGpu }}</td>
                  <td class="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{{ entrada.materiaGpu }}</td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.profGpu" class="font-mono text-slate-700 dark:text-slate-300">{{ entrada.profGpu }}</span>
                    <span v-if="entrada.profNomGpu && entrada.profNomGpu !== entrada.profGpu" class="ml-1 text-slate-500 dark:text-slate-500">{{ entrada.profNomGpu }}</span>
                    <span v-if="!entrada.profGpu" class="text-slate-500">-</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.classeApp" class="text-slate-700 dark:text-slate-300">
                      {{ entrada.classeApp.curs }} {{ entrada.classeApp.grup }}
                    </span>
                    <span v-else class="text-slate-500">-</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.profNomApp" class="text-slate-700 dark:text-slate-300">
                      {{ entrada.profNomApp }}
                      <span v-if="entrada.profCodeApp" class="ml-1 font-mono text-slate-500">({{ entrada.profCodeApp }})</span>
                    </span>
                    <span v-else class="text-slate-500">-</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="entrada.classeApp && Number(entrada.horesGpu) !== Number(entrada.classeApp.hores)" class="font-semibold text-amber-900 dark:text-amber-300">
                      {{ entrada.horesGpu }}/{{ entrada.classeApp.hores }}
                    </span>
                    <span v-else>{{ entrada.horesGpu }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <span :class="['rounded px-1.5 py-0.5 text-xs font-bold', estatBadgeClass(entrada.estat)]">
                      {{ estatEtiqueta(entrada.estat) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!entradesFiltrades.length">
                  <td colspan="8" class="px-3 py-4 text-center text-slate-500 dark:text-slate-500">Cap entrada per al filtre seleccionat.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- App classes not in GPU002 -->
          <div v-if="comparacio.senseEntrada.length" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
            <h5 class="text-sm font-bold text-rose-900 dark:text-rose-200">
              Lliçons de l'app no trobades al GPU002 ({{ comparacio.senseEntrada.length }})
            </h5>
            <div class="mt-2 max-h-48 space-y-1 overflow-auto">
              <div
                v-for="(c, i) in comparacio.senseEntrada"
                :key="i"
                class="rounded bg-white px-3 py-1.5 text-xs text-rose-800 dark:bg-gray-900 dark:text-rose-300"
              >
                <span class="font-mono font-semibold">{{ c.curs }} {{ c.grup }}</span>
                · {{ c.materia }} · {{ c.hores }}h
                · {{ c.professorAssignat || c.professors?.[0] || '-' }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Modal confirmació substitució XML -->
  <div
    v-if="confirmarSubstitucioXml"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="cancelarSubstitucioXml"
  >
    <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900">
      <h4 class="text-lg font-bold text-slate-950 dark:text-white">Substituir l'XML de GestIB?</h4>
      <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">
        L'XML desat per a aquest curs se sobreescriurà a Firestore. No es modificaran classes, professors ni assignacions, i el canvi no es pot desfer des de l'aplicació.
      </p>
      <div class="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm dark:bg-gray-800">
        <p class="text-slate-600 dark:text-slate-400">Actual: <strong class="text-slate-900 dark:text-white">{{ gestibXmlRemot?.nom }}</strong></p>
        <p class="mt-1 text-slate-600 dark:text-slate-400">Nou: <strong class="text-slate-900 dark:text-white">{{ xmlGestibPendent?.nom }}</strong></p>
      </div>
      <div class="mt-5 flex justify-end gap-3">
        <button
          @click="cancelarSubstitucioXml"
          :disabled="pujantXmlRemot"
          class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-gray-800"
        >
          Cancel·lar
        </button>
        <button
          @click="substituirXmlGestib"
          :disabled="pujantXmlRemot"
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {{ pujantXmlRemot ? 'Desant...' : 'Substitueix' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal confirmació esborra mapeig -->
  <div
    v-if="confirmarEsborra"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="confirmarEsborra = false"
  >
    <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <h4 class="text-lg font-bold text-slate-950 dark:text-white">Esborra mapeig</h4>
      <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">
        S'esborrarà tot el mapeig guardat per a aquest curs. Hauràs de tornar a revisar el mapeig manualment.
      </p>
      <div class="mt-4 flex justify-end gap-3">
        <button
          @click="confirmarEsborra = false"
          class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-gray-800"
        >
          Cancel·lar
        </button>
        <button
          @click="esborraMapeig"
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Esborra
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import SelectBuscador from './SelectBuscador.vue';
import AdminSectionNav from './AdminSectionNav.vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  descarregarFitxerUntis,
  descarregarTotsElsFitxersUntis,
  prepararExportUntis,
  compararAmbGpu002,
  previsualitzarMapeigGestib,
  clauOverride,
} from '../services/untisExport';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';
import {
  carregarXmlGestibRemot,
  desarXmlGestibRemot,
  obtenirInfoXmlGestibRemot,
  validarXmlGestibPerDesar,
} from '../services/gestibXmlStorage';

const cursStore = useCursStore();
const toast = useToastStore();

const carregant = ref(false);
const error = ref('');
const exportacio = ref(null);
const referenciaGpu002Text = ref('');
const referenciaGestibXmlText = ref('');
const gestibXmlNom = ref('');
const gestibXmlRemot = ref(null);
const carregantXmlRemot = ref(false);
const pujantXmlRemot = ref(false);
const confirmarSubstitucioXml = ref(false);
const xmlGestibPendent = ref(null);
let tokenCarregaXmlRemot = 0;
const gpu002ReferenciaNom = ref('');
const simular = ref(true);
const activeSection = ref('flux-untis');

const sectionItems = computed(() => [
  {
    id: 'flux-untis',
    label: 'Flux Untis',
    description: 'XML, referència i generació',
  },
  totes.value.length
    ? {
        id: 'correspondencies-gestib',
        label: 'Mapeig',
        description: 'Mapeig GestIB',
        badge: pendentsCount.value ? `${pendentsCount.value} pend.` : 'OK',
        tone: pendentsCount.value ? 'warning' : '',
      }
    : null,
  {
    id: 'mode-simulacio',
    label: 'Simulació',
    description: 'Verificar sense guardar',
    tone: simular.value ? 'warning' : '',
  },
  exportacio.value?.ccp
    ? {
        id: 'ccp-caps',
        label: 'CCP',
        description: 'Caps i hores lectives',
        badge: exportacio.value.ccp.totalAssistents || '',
        tone: exportacio.value.ccp.simulacio ? 'warning' : '',
      }
    : null,
  exportacio.value?.atencioFamilies
    ? {
        id: 'atencio-families',
        label: 'Atenció famílies',
        description: 'Hora complementària',
        badge: exportacio.value.atencioFamilies.totalProfessors || '',
        tone: exportacio.value.atencioFamilies.simulacio ? 'warning' : '',
      }
    : null,
  exportacio.value?.reunionsDepartament
    ? {
        id: 'reunions-departament',
        label: 'Departaments',
        description: 'Reunions departament',
        badge: exportacio.value.reunionsDepartament.totalDepartaments || '',
        tone: exportacio.value.reunionsDepartament.simulacio ? 'warning' : '',
      }
    : null,
  exportacio.value?.reunionsCoordinacio
    ? {
        id: 'reunions-docents',
        label: 'Equips docents',
        description: 'Reunions coordinació',
        badge: exportacio.value.reunionsCoordinacio.totalReunions || '',
        tone: exportacio.value.reunionsCoordinacio.simulacio ? 'warning' : '',
      }
    : null,
  exportacio.value
    ? {
        id: 'previsualitzacio-untis',
        label: 'Previsualitzacio',
        description: "Taula abans d'importar",
        badge: exportacio.value.vistaPrevia?.length || '',
        tone: exportacio.value.pendents?.length ? 'warning' : '',
      }
    : null,
  exportacio.value
    ? {
        id: 'fitxers-preparats',
        label: 'Fitxers',
        description: 'Vista prèvia i descàrrega',
        badge: exportacio.value.fitxers?.length || '',
      }
    : null,
  exportacio.value?.pendents?.length
    ? {
        id: 'pendents-revisar',
        label: 'Pendents',
        description: 'Classes a revisar',
        badge: exportacio.value.pendents.length,
        tone: 'warning',
      }
    : null,
  {
    id: 'comparador-gpu',
    label: 'Comparador',
    description: 'Revisió amb GPU002',
  },
].filter(Boolean));

// Mapeig GestIB
const totes = ref([]);
const analitzant = ref(false);
const mapeigManual = ref({});
const gestibActual = ref(null);
const filtreMapateg = ref('totes');

const totesMateriesOpcions = computed(() => {
  if (!gestibActual.value?.materies) return [];
  return gestibActual.value.materies
    .map((m) => ({ codiUntis: m.codiUntis, label: `${m.codiUntis} · ${m.descripcio}`, cursDescripcio: m.cursDescripcio || '' }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

const totesActivitatsOpcionsObsoletes = computed(() => {
  if (!gestibActual.value?.activitatsMap) return [];
  return [...gestibActual.value.activitatsMap.values()]
    .map((a) => ({ codiUntis: a.codiUntis, label: `${a.codiUntis} · ${a.descripcio.replace(/^\*/, '').trim()}`, cursDescripcio: '' }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

const totesActivitatsOpcions = computed(() => {
  if (!gestibActual.value?.activitatsMap) return [];
  return [...gestibActual.value.activitatsMap.values()]
    .map((a) => ({
      codiUntis: a.codiUntis,
      label: [a.codiUntis, a.etiqueta || a.descripcio].filter(Boolean).join(' · '),
      cursDescripcio: '',
    }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

const materiesOpcionsUntis = computed(() => {
  if (!gestibActual.value?.materies) return [];
  return gestibActual.value.materies
    .map((m) => ({
      codiUntis: m.codiUntis,
      label: ['Materia', m.codiUntis, m.descripcio].filter(Boolean).join(' - '),
      cursDescripcio: m.cursDescripcio || '',
    }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

const activitatsOpcionsUntis = computed(() => {
  if (!gestibActual.value?.activitatsMap) return [];
  return [...gestibActual.value.activitatsMap.values()]
    .map((a) => ({
      codiUntis: a.codiUntis,
      label: ['Activitat', a.codiUntis, a.etiqueta || a.descripcio].filter(Boolean).join(' - '),
      cursDescripcio: '',
    }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

function esMapeigActivitat(m) {
  return Boolean(m?.senseAmbdos || m?.esActivitat || (m?.materia || '').toString().trim().startsWith('*'));
}

function poolOpcionsPerMapeig(m) {
  if (esMapeigActivitat(m)) return activitatsOpcionsUntis.value;
  return [...materiesOpcionsUntis.value, ...activitatsOpcionsUntis.value];
}

function codisValidsPerMapeig(m) {
  return new Set(poolOpcionsPerMapeig(m).map((opcio) => opcio.codiUntis));
}

function netejarMapeigManual(classesMapeig, overrides) {
  const perClau = new Map(classesMapeig.map((m) => [m.clau, m]));
  const net = {};
  let eliminats = 0;

  Object.entries(overrides || {}).forEach(([clau, codiUntis]) => {
    const m = perClau.get(clau);
    if (!m || !codisValidsPerMapeig(m).has(codiUntis)) {
      eliminats++;
      return;
    }
    net[clau] = codiUntis;
  });

  return { net, eliminats };
}

function codiActualMapeig(m) {
  return mapeigManual.value[m.clau] || m.autoCodiUntis || '';
}

function estatMapeigActual(m) {
  if (mapeigManual.value[m.clau]) return 'manual';
  return m.estat;
}

function estatMapeigBadgeClass(m) {
  const estat = estatMapeigActual(m);
  if (estat === 'manual') return 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300';
  if (estat === 'autoMatch') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (estat === 'autoGpu002') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300';
}

function estatMapeigEtiqueta(m) {
  const estat = estatMapeigActual(m);
  if (estat === 'manual') return 'Manual';
  if (estat === 'autoMatch') return 'Auto';
  if (estat === 'autoGpu002') return 'GPU002';
  return 'Pendent';
}

function pesCurs(curs) {
  const c = (curs || '').toUpperCase().replace(/[\s.]/g, '');
  const eso = c.match(/^([1-4])ESO/);
  if (eso) return parseInt(eso[1]);
  const bat = c.match(/^([12])BAT/);
  if (bat) return 4 + parseInt(bat[1]);
  return 99;
}

function opcionsPerClau(m) {
  const pool = poolOpcionsPerMapeig(m);
  const suggeritsSet = new Set((m.candidats || []).map((c) => c.codiUntis));
  const suggerits = (m.candidats || []).map((c) => ({
    value: c.codiUntis,
    nom: c.label.replace(/^[A-Z0-9-]+\s*·\s*/, '').trim(),
    nom: c.label,
    suggerit: true,
  }));
  const rest = pool
    .filter((item) => !suggeritsSet.has(item.codiUntis))
    .map((item) => ({
      value: item.codiUntis,
      nom: [item.label.replace(/^[A-Z0-9-]+\s*·\s*/, '').trim(), item.cursDescripcio].filter(Boolean).join(' - '),
      nom: [item.label, item.cursDescripcio].filter(Boolean).join(' - '),
      suggerit: false,
    }));
  return [...suggerits, ...rest];
}

const pendentsCount = computed(() => totes.value.filter((m) => !codiActualMapeig(m)).length);
const resoltesCount = computed(() => totes.value.filter((m) => codiActualMapeig(m)).length);

const classesFiltrades = computed(() => {
  if (filtreMapateg.value === 'pendents') return totes.value.filter((m) => !codiActualMapeig(m));
  if (filtreMapateg.value === 'resoltes') return totes.value.filter((m) => codiActualMapeig(m));
  return totes.value;
});

const MAPEIG_DOC = 'untis_mapeig';
const mapeigRef = (cursId) => doc(db, 'cursos', cursId, 'config', MAPEIG_DOC);

watch(() => cursStore.cursActiuId, async (cursId) => {
  if (!cursId) {
    mapeigManual.value = {};
    return;
  }
  try {
    const snap = await getDoc(mapeigRef(cursId));
    if (snap.exists()) {
      mapeigManual.value = snap.data().overrides || {};
    } else {
      const legacySnap = await getDoc(doc(db, 'config', MAPEIG_DOC));
      const legacyMapeig = legacySnap.exists() ? (legacySnap.data()[cursId] || {}) : {};
      mapeigManual.value = legacyMapeig;
      if (Object.keys(legacyMapeig).length) {
        await setDoc(mapeigRef(cursId), { overrides: legacyMapeig }, { merge: true });
      }
    }
  } catch {
    mapeigManual.value = {};
  }
  await carregarXmlGestibDesat(cursId);
}, { immediate: true });

const confirmarEsborra = ref(false);

async function esborraMapeig() {
  confirmarEsborra.value = false;
  mapeigManual.value = {};
  try {
    await setDoc(
      mapeigRef(cursStore.cursActiuId),
      { overrides: {} },
      { merge: true }
    );
    toast.ok('Mapeig esborrat.');
  } catch (err) {
    console.error('Error esborrant mapeig:', err);
    toast.error('Error esborrant el mapeig.');
  }
}

async function assignarOverride(clau, codiUntis) {
  if (codiUntis) {
    mapeigManual.value = { ...mapeigManual.value, [clau]: codiUntis };
  } else {
    const { [clau]: _, ...rest } = mapeigManual.value;
    mapeigManual.value = rest;
  }
  try {
    await setDoc(
      mapeigRef(cursStore.cursActiuId),
      { overrides: mapeigManual.value },
      { merge: true }
    );
  } catch (err) {
    console.error('Error guardant mapeig:', err);
    toast.error('Error guardant el mapeig de matèries.');
  }
}

const filtreVistaPrevia = ref('');
const filtreVistaPreviaMode = ref('totes');
const mostrarVistaPrevia = ref(false);

const filtresVistaPrevia = [
  { valor: 'totes', etiqueta: 'Totes' },
  { valor: 'multi', etiqueta: 'Blocs multiples' },
  { valor: 'activitats', etiqueta: 'Activitats' },
  { valor: 'referencia', etiqueta: 'Amb referencia' },
  { valor: 'generades', etiqueta: 'Generades' },
];

const gpu002ComparacioText = ref('');
const gpu002ComparacioNom = ref('');
const comparacioCarregant = ref(false);
const comparacioError = ref('');
const comparacio = ref(null);
const filtreActiu = ref('tots');

const filtres = [
  { valor: 'tots', etiqueta: 'Tots' },
  { valor: 'ok', etiqueta: 'Coincideix' },
  { valor: 'diferentProf', etiqueta: 'Prof diferent' },
  { valor: 'diferentHores', etiqueta: 'Hores diferents' },
  { valor: 'noTrobat', etiqueta: 'No a l\'app' },
  { valor: 'senseProfGpu', etiqueta: 'Sense prof GPU' },
  { valor: 'senseProfApp', etiqueta: 'Sense prof App' },
];

const entradesFiltrades = computed(() => {
  if (!comparacio.value) return [];
  if (filtreActiu.value === 'tots') return comparacio.value.entrades;
  return comparacio.value.entrades.filter((e) => e.estat === filtreActiu.value);
});

const gpu002Fitxer = computed(() =>
  exportacio.value?.fitxers?.find((fitxer) => fitxer.nom === 'GPU002.TXT') || null
);

const ccpCapsOrdenats = computed(() =>
  [...(exportacio.value?.ccp?.caps || [])].sort((a, b) => {
    if (a.elegible !== b.elegible) return a.elegible ? -1 : 1;
    const departament = (a.departament || '').localeCompare(b.departament || '');
    if (departament) return departament;
    return (a.professor || '').localeCompare(b.professor || '');
  })
);

const atencioFamiliesProfessorsOrdenats = computed(() =>
  [...(exportacio.value?.atencioFamilies?.professors || [])].sort((a, b) => {
    const departament = (a.departament || '').localeCompare(b.departament || '');
    if (departament) return departament;
    return (a.nom || '').localeCompare(b.nom || '');
  })
);

const reunionsDepartamentOrdenades = computed(() =>
  [...(exportacio.value?.reunionsDepartament?.reunions || [])].sort((a, b) =>
    (a.departament || '').localeCompare(b.departament || '')
  )
);

const reunionsCoordinacioOrdenades = computed(() =>
  [...(exportacio.value?.reunionsCoordinacio?.equips || [])].sort((a, b) =>
    Number(a.numero || 0) - Number(b.numero || 0) ||
    (a.etiqueta || '').localeCompare(b.etiqueta || '')
  )
);

const reunionsCoordinacioExclosos = computed(() =>
  [...(exportacio.value?.reunionsCoordinacio?.exclosos || [])].sort((a, b) =>
    [a.curs, a.grup, a.materia, a.motiu].join('|').localeCompare([b.curs, b.grup, b.materia, b.motiu].join('|'))
  )
);

const vistaPreviaFiltrada = computed(() => {
  const llista = exportacio.value?.vistaPrevia || [];
  const filtre = normalitzarFiltre(filtreVistaPrevia.value);

  return llista.filter((item) => {
    if (!passaFiltreVistaPreviaMode(item, filtreVistaPreviaMode.value)) return false;
    if (!filtre) return true;
    return normalitzarFiltre([
      item.numero,
      item.bloc,
      item.curs,
      item.grup,
      item.codiGrups,
      item.materia,
      item.codiMateria,
      item.tipus,
      ...(item.professors || []),
      ...(item.codisProfessors || []),
      ...(item.notes || []),
      ...(item.liniesUntis || []).flatMap((linia) => [
        linia.codiGrup,
        linia.codiProfessor,
        linia.codiMateria,
        linia.professor,
        linia.idUntis,
      ]),
    ].join(' ')).includes(filtre);
  });
});

const vistaPreviaStats = computed(() => {
  const llista = exportacio.value?.vistaPrevia || [];
  return {
    total: llista.length,
    linies: llista.reduce((total, item) => total + Number(item.linies || item.liniesUntis?.length || 0), 0),
    multiLinia: llista.filter((item) => Number(item.linies || item.liniesUntis?.length || 0) > 1).length,
    activitats: llista.filter((item) => item.esActivitat).length,
    referencia: llista.filter((item) => item.font === 'referencia').length,
  };
});

function passaFiltreVistaPreviaMode(item, mode) {
  if (mode === 'multi') return Number(item.linies || item.liniesUntis?.length || 0) > 1;
  if (mode === 'activitats') return Boolean(item.esActivitat);
  if (mode === 'referencia') return item.font === 'referencia';
  if (mode === 'generades') return item.font !== 'referencia';
  return true;
}

function countVistaPreviaFiltre(mode) {
  return (exportacio.value?.vistaPrevia || []).filter((item) => passaFiltreVistaPreviaMode(item, mode)).length;
}

function formatHoresUntis(valor) {
  const numero = Number(valor) || 0;
  return Number.isInteger(numero) ? `${numero}h` : `${numero.toFixed(2)}h`;
}

function previsualitzacioRowClass(item) {
  if (item.esActivitat) return 'bg-violet-50/45 dark:bg-violet-950/10';
  if (Number(item.linies || item.liniesUntis?.length || 0) > 1) return 'bg-blue-50/45 dark:bg-blue-950/10';
  return '';
}

function blocBadgeClass(item) {
  const bloc = normalitzarFiltre(item.bloc);
  if (bloc.includes('optativa')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (bloc.includes('flexible')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
  if (bloc.includes('desdoblament') || bloc.includes('codocencia')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  if (bloc.includes('suport')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (bloc.includes('activitat')) return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300';
  return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-slate-300';
}

function normalitzarFiltre(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function generar() {
  carregant.value = true;
  error.value = '';
  filtreVistaPrevia.value = '';
  filtreVistaPreviaMode.value = 'totes';
  mostrarVistaPrevia.value = false;
  try {
    exportacio.value = await prepararExportUntis(cursStore.cursActiuId, {
      referenciaGpu002Text: referenciaGpu002Text.value,
      referenciaGestibXmlText: referenciaGestibXmlText.value,
      simular: simular.value,
      overrides: Object.keys(mapeigManual.value).length ? mapeigManual.value : null,
    });
    activeSection.value = exportacio.value?.reunionsDepartament
      ? 'reunions-departament'
      : exportacio.value?.atencioFamilies
        ? 'atencio-families'
        : exportacio.value?.reunionsCoordinacio
          ? 'reunions-docents'
          : exportacio.value?.ccp
            ? 'ccp-caps'
            : 'previsualitzacio-untis';
  } catch (err) {
    console.error('Error generant exportació Untis:', err);
    error.value = `No s'han pogut generar els fitxers per a Untis: ${err.message || err}`;
  } finally {
    carregant.value = false;
  }
}

function reiniciarResultatsXml() {
  exportacio.value = null;
  filtreVistaPrevia.value = '';
  filtreVistaPreviaMode.value = 'totes';
  mostrarVistaPrevia.value = false;
  totes.value = [];
  gestibActual.value = null;
}

function aplicarXmlGestib({ text, nom, info }) {
  referenciaGestibXmlText.value = text;
  gestibXmlNom.value = nom;
  gestibXmlRemot.value = info;
  reiniciarResultatsXml();
}

async function carregarXmlGestibDesat(cursId) {
  const token = ++tokenCarregaXmlRemot;
  carregantXmlRemot.value = true;
  referenciaGestibXmlText.value = '';
  gestibXmlNom.value = '';
  gestibXmlRemot.value = null;
  xmlGestibPendent.value = null;
  confirmarSubstitucioXml.value = false;
  reiniciarResultatsXml();
  try {
    const resultat = await carregarXmlGestibRemot(cursId);
    if (token !== tokenCarregaXmlRemot || cursId !== cursStore.cursActiuId) return;
    if (!resultat) return;
    aplicarXmlGestib({ text: resultat.text, nom: resultat.nom, info: resultat });
    await analitzarMapeig();
  } catch (err) {
    if (token !== tokenCarregaXmlRemot) return;
    console.error('Error carregant XML remot de GestIB:', err);
    error.value = `No s'ha pogut carregar l'XML de GestIB desat: ${err.message || err}`;
  } finally {
    if (token === tokenCarregaXmlRemot) carregantXmlRemot.value = false;
  }
}

async function desarXmlSeleccionat(item) {
  if (!item || pujantXmlRemot.value) return;
  pujantXmlRemot.value = true;
  error.value = '';
  try {
    const info = await desarXmlGestibRemot(item.cursId, { text: item.text, nom: item.nom });
    if (item.cursId !== cursStore.cursActiuId) return;
    aplicarXmlGestib({ text: item.text, nom: item.nom, info });
    await analitzarMapeig();
    toast.ok('XML de GestIB desat remotament.');
  } catch (err) {
    console.error('Error desant XML remot de GestIB:', err);
    error.value = `No s'ha pogut desar l'XML de GestIB: ${err.message || err}`;
  } finally {
    pujantXmlRemot.value = false;
  }
}

async function carregarGestibXml(event) {
  const input = event.target;
  const fitxer = input.files?.[0];
  input.value = '';
  if (!fitxer || pujantXmlRemot.value) return;
  const cursId = cursStore.cursActiuId;
  error.value = '';
  try {
    const text = await fitxer.text();
    validarXmlGestibPerDesar(text);
    const existent = await obtenirInfoXmlGestibRemot(cursId);
    const item = { cursId, text, nom: fitxer.name };
    if (existent) {
      gestibXmlRemot.value = existent;
      xmlGestibPendent.value = item;
      confirmarSubstitucioXml.value = true;
      return;
    }
    await desarXmlSeleccionat(item);
  } catch (err) {
    console.error('Error preparant XML de GestIB:', err);
    error.value = `No s'ha pogut preparar l'XML de GestIB: ${err.message || err}`;
  }
}

function cancelarSubstitucioXml() {
  if (pujantXmlRemot.value) return;
  confirmarSubstitucioXml.value = false;
  xmlGestibPendent.value = null;
}

async function substituirXmlGestib() {
  const item = xmlGestibPendent.value;
  confirmarSubstitucioXml.value = false;
  xmlGestibPendent.value = null;
  await desarXmlSeleccionat(item);
}

function formatDataXmlRemot(valor) {
  if (!valor) return '';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('ca-ES');
}

async function carregarGpu002Referencia(event) {
  const fitxer = event.target.files?.[0];
  referenciaGpu002Text.value = '';
  gpu002ReferenciaNom.value = '';
  exportacio.value = null;
  filtreVistaPrevia.value = '';
  filtreVistaPreviaMode.value = 'totes';
  mostrarVistaPrevia.value = false;
  error.value = '';
  if (!fitxer) return;
  try {
    referenciaGpu002Text.value = await fitxer.text();
    gpu002ReferenciaNom.value = fitxer.name;
    if (referenciaGestibXmlText.value) {
      await analitzarMapeig();
    }
  } catch (err) {
    console.error('Error llegint GPU002 de referència:', err);
    error.value = 'No s\'ha pogut llegir el GPU002.TXT.';
  }
}

async function analitzarMapeig() {
  if (!referenciaGestibXmlText.value) return;
  analitzant.value = true;
  totes.value = [];
  try {
    const resultat = await previsualitzarMapeigGestib(
      cursStore.cursActiuId,
      referenciaGestibXmlText.value,
      referenciaGpu002Text.value,
    );
    gestibActual.value = resultat.gestib;
    totes.value = resultat.classes.sort((a, b) => {
      if (a.esActivitat !== b.esActivitat) return a.esActivitat ? 1 : -1;
      const byCurs = pesCurs(a.curs) - pesCurs(b.curs)
        || (a.curs || '').localeCompare(b.curs || '', 'ca');
      if (byCurs !== 0) return byCurs;
      const byGrup = (a.grup || '').localeCompare(b.grup || '', 'ca');
      if (byGrup !== 0) return byGrup;
      return (a.materia || '').localeCompare(b.materia || '', 'ca');
    });

    const mapeigNet = netejarMapeigManual(resultat.classes, mapeigManual.value);
    if (mapeigNet.eliminats > 0) {
      mapeigManual.value = mapeigNet.net;
      await setDoc(
        mapeigRef(cursStore.cursActiuId),
        { overrides: mapeigManual.value },
        { merge: true }
      );
      toast.ok(`${mapeigNet.eliminats} mapeigs antics eliminats.`);
    }

    const nousMapeigs = {};
    for (const m of resultat.classes) {
      if (m.estat === 'autoGpu002' && !mapeigManual.value[m.clau]) {
        nousMapeigs[m.clau] = m.autoCodiUntis;
      }
    }
    if (Object.keys(nousMapeigs).length) {
      mapeigManual.value = { ...mapeigManual.value, ...nousMapeigs };
      try {
        await setDoc(
          mapeigRef(cursStore.cursActiuId),
          { overrides: mapeigManual.value },
          { merge: true }
        );
      } catch (saveErr) {
        console.error('Error guardant mapeig automàtic:', saveErr);
      }
    }
  } catch (e) {
    console.error('Error analitzant mapeig GestIB:', e);
    error.value = e.message || 'Error analitzant mapeig GestIB';
  } finally {
    analitzant.value = false;
  }
}

async function carregarGpu002Comparar(event) {
  const fitxer = event.target.files?.[0];
  gpu002ComparacioText.value = '';
  gpu002ComparacioNom.value = '';
  comparacio.value = null;
  comparacioError.value = '';
  if (!fitxer) return;
  try {
    gpu002ComparacioText.value = await fitxer.text();
    gpu002ComparacioNom.value = fitxer.name;
  } catch (err) {
    comparacioError.value = 'No s\'ha pogut llegir el fitxer.';
  }
}

async function comparar() {
  if (!gpu002ComparacioText.value || comparacioCarregant.value) return;
  comparacioCarregant.value = true;
  comparacioError.value = '';
  filtreActiu.value = 'tots';
  try {
    comparacio.value = await compararAmbGpu002(cursStore.cursActiuId, gpu002ComparacioText.value);
  } catch (err) {
    console.error('Error comparant GPU002:', err);
    comparacioError.value = 'Error en comparar: ' + err.message;
  } finally {
    comparacioCarregant.value = false;
  }
}

function descarregar(fitxer) {
  descarregarFitxerUntis(fitxer);
}

function descarregarTots() {
  descarregarTotsElsFitxersUntis(exportacio.value.fitxers);
}

function obrirPrevisualitzacio() {
  if (!exportacio.value?.vistaPrevia?.length) {
    descarregarGpu002();
    return;
  }
  activeSection.value = 'previsualitzacio-untis';
}

function descarregarGpu002() {
  if (gpu002Fitxer.value) descarregarFitxerUntis(gpu002Fitxer.value);
}

function resumClasse(classe) {
  return [
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${classe.hores} h` : '',
    classe.professorAssignat || '',
  ].filter(Boolean).join(' | ');
}

function estatRowClass(estat) {
  const base = 'transition-colors';
  if (estat === 'ok') return `${base} bg-success/5 dark:bg-success/5`;
  if (estat === 'diferentProf') return `${base} bg-blue-50 dark:bg-blue-950/20`;
  if (estat === 'diferentHores') return `${base} bg-amber-50 dark:bg-amber-950/20`;
  if (estat === 'noTrobat') return `${base} bg-danger/10 dark:bg-danger/5`;
  if (estat === 'senseProfGpu') return `${base} bg-orange-50 dark:bg-orange-950/20`;
  if (estat === 'senseProfApp') return `${base} bg-purple-50 dark:bg-purple-950/20`;
  return base;
}

function estatBadgeClass(estat) {
  if (estat === 'ok') return 'bg-success/20 text-[#007820] dark:text-success';
  if (estat === 'diferentProf') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (estat === 'diferentHores') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  if (estat === 'noTrobat') return 'bg-danger/20 text-danger-dark dark:text-danger';
  if (estat === 'senseProfGpu') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  if (estat === 'senseProfApp') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  return 'bg-slate-100 text-slate-700';
}

function estatEtiqueta(estat) {
  const etiquetes = {
    ok: 'OK',
    diferentProf: 'Prof !=',
    diferentHores: 'Hores !=',
    noTrobat: 'No trobat',
    senseProfGpu: 'Sense prof GPU',
    senseProfApp: 'Sense prof App',
  };
  return etiquetes[estat] || estat;
}
</script>

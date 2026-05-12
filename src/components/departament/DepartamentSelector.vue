<template>
  <div class="form-section mb-6">
    <label class="form-label">
      Seleccionar Departament:
      <select :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" class="form-input mt-1">
        <option value="">Selecciona un departament</option>
        <option v-for="dep in departaments" :key="dep.id" :value="dep.nom">
          {{ dep.nom }}
        </option>
      </select>
    </label>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  departaments: {
    type: Array,
    default: () => []
  }
});

defineEmits(['update:modelValue']);
</script>
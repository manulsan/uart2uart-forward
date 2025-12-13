<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Select UART Port for {{ mcuType.toUpperCase() }}</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-option-group
          v-model="selectedPortValue"
          :options="portOptions"
          color="primary"
          type="radio"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" @click="handleCancel" />
        <q-btn flat label="OK" color="primary" :disable="!selectedPortValue" @click="handleOk" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface PortOption {
  label: string;
  value: string;
}

interface Props {
  modelValue: boolean;
  mcuType: 'stm' | 'esp32';
  portOptions: PortOption[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [port: string];
  cancel: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const selectedPortValue = ref<string>(props.portOptions[0]?.value || '');

// Update selected value when portOptions change
watch(
  () => props.portOptions,
  (newOptions) => {
    if (newOptions.length > 0 && !selectedPortValue.value) {
      selectedPortValue.value = newOptions[0]?.value || '';
    }
  },
  { immediate: true },
);

const handleOk = () => {
  if (selectedPortValue.value) {
    emit('select', selectedPortValue.value);
    isOpen.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
  isOpen.value = false;
};
</script>

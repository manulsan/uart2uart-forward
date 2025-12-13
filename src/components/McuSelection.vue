<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Select STMicroelectronics MCU</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-select
          v-model="selectedMcu"
          :options="mcuOptions"
          label="MCU Part Number"
          outlined
          dense
          emit-value
          map-options
          option-value="value"
          option-label="label"
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="grey" @click="handleCancel" />
        <q-btn flat label="OK" color="primary" :disable="!selectedMcu" @click="handleOk" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  select: [mcu: string];
  cancel: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const selectedMcu = ref('stm8l051f3');

// Common STM8 MCU list
const mcuOptions = [
  { label: 'STM8S103F2', value: 'stm8s103f2' },
  { label: 'STM8S103F3', value: 'stm8s103f3' },
  { label: 'STM8S103K3', value: 'stm8s103k3' },
  { label: 'STM8S105C4', value: 'stm8s105c4' },
  { label: 'STM8S105C6', value: 'stm8s105c6' },
  { label: 'STM8S105K4', value: 'stm8s105k4' },
  { label: 'STM8S105K6', value: 'stm8s105k6' },
  { label: 'STM8S207C6', value: 'stm8s207c6' },
  { label: 'STM8S207C8', value: 'stm8s207c8' },
  { label: 'STM8S207S6', value: 'stm8s207s6' },
  { label: 'STM8S207S8', value: 'stm8s207s8' },
  { label: 'STM8S208C6', value: 'stm8s208c6' },
  { label: 'STM8S208C8', value: 'stm8s208c8' },
  { label: 'STM8L050J3', value: 'stm8l050j3' },
  { label: 'STM8L051F3', value: 'stm8l051f3' },
  { label: 'STM8L052C6', value: 'stm8l052c6' },
  { label: 'STM8L052R8', value: 'stm8l052r8' },
  { label: 'STM8L101F2', value: 'stm8l101f2' },
  { label: 'STM8L101F3', value: 'stm8l101f3' },
  { label: 'STM8L101G2', value: 'stm8l101g2' },
  { label: 'STM8L101G3', value: 'stm8l101g3' },
  { label: 'STM8L101K3', value: 'stm8l101k3' },
  { label: 'STM8L151C2', value: 'stm8l151c2' },
  { label: 'STM8L151C3', value: 'stm8l151c3' },
  { label: 'STM8L151C4', value: 'stm8l151c4' },
  { label: 'STM8L151C6', value: 'stm8l151c6' },
  { label: 'STM8L151C8', value: 'stm8l151c8' },
  { label: 'STM8L151F2', value: 'stm8l151f2' },
  { label: 'STM8L151F3', value: 'stm8l151f3' },
  { label: 'STM8L151G2', value: 'stm8l151g2' },
  { label: 'STM8L151G3', value: 'stm8l151g3' },
  { label: 'STM8L151G4', value: 'stm8l151g4' },
  { label: 'STM8L151G6', value: 'stm8l151g6' },
  { label: 'STM8L151K2', value: 'stm8l151k2' },
  { label: 'STM8L151K4', value: 'stm8l151k4' },
  { label: 'STM8L151K6', value: 'stm8l151k6' },
  { label: 'STM8L151M8', value: 'stm8l151m8' },
  { label: 'STM8L151R6', value: 'stm8l151r6' },
  { label: 'STM8L151R8', value: 'stm8l151r8' },
  { label: 'STM8L152C4', value: 'stm8l152c4' },
  { label: 'STM8L152C6', value: 'stm8l152c6' },
  { label: 'STM8L152C8', value: 'stm8l152c8' },
  { label: 'STM8L152K4', value: 'stm8l152k4' },
  { label: 'STM8L152K6', value: 'stm8l152k6' },
  { label: 'STM8L152M8', value: 'stm8l152m8' },
  { label: 'STM8L152R6', value: 'stm8l152r6' },
  { label: 'STM8L152R8', value: 'stm8l152r8' },
  { label: 'STM8L162M8', value: 'stm8l162m8' },
  { label: 'STM8L162R8', value: 'stm8l162r8' },
  { label: 'STM8AF52A6', value: 'stm8af52a6' },
  { label: 'STM8AF6266', value: 'stm8af6266' },
];

const handleOk = () => {
  if (selectedMcu.value) {
    emit('select', selectedMcu.value);
    isOpen.value = false;
  }
};

const handleCancel = () => {
  emit('cancel');
  isOpen.value = false;
};

onMounted(() => {
  selectedMcu.value = 'stm8l051f3';
});
</script>

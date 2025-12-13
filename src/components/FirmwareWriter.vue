<template>
  <q-card flat bordered>
    <q-card-section class="q-pa-sm">
      <div class="text-subtitle2 q-mb-sm">
        Firmware Writing - {{ mcuType === 'stm' ? 'STM MCU' : 'ESP32' + ` (${port})` }}
      </div>
      <div class="row q-col-gutter-sm items-center">
        <div class="col">
          <q-input
            v-model="firmwarePath"
            label="Firmware File"
            outlined
            dense
            readonly
            placeholder="Select firmware file..."
          />
        </div>
        <div class="col-auto">
          <q-btn label="Browse" dense @click="selectFile" />
        </div>
        <div class="col-auto">
          <q-btn
            label="Download"
            color="primary"
            dense
            :disable="!firmwarePath"
            @click="download"
          />
        </div>
        <div class="col-auto">
          <q-btn label="Close" flat dense @click="$emit('close')" />
        </div>
      </div>
      <div v-if="progress > 0" class="q-mt-sm">
        <q-linear-progress :value="progress / 100" color="primary" />
        <div class="text-caption text-center">{{ progress }}%</div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  mcuType: 'stm' | 'esp32';
  port?: string;
  stmMcu?: string;
}

const props = defineProps<Props>();
// const emit = defineEmits<{
//   close: [];
// }>();

const firmwarePath = ref('');
const progress = ref(0);

const selectFile = async () => {
  try {
    const result = await window.electronAPI.selectFirmwareFile(props.mcuType);

    if (result.success && result.filePath) {
      firmwarePath.value = result.filePath;
      console.log('Selected firmware file:', result.filePath);
    } else if (result.cancelled) {
      console.log('File selection cancelled');
    } else {
      console.error('Failed to select file:', result.error);
    }
  } catch (err) {
    console.error('Error selecting file:', err);
  }
};

//const download = async () => {
const download = async () => {
  if (!firmwarePath.value) {
    return;
  }

  try {
    progress.value = 0;

    console.log('Downloading firmware:', firmwarePath.value, 'to', props.mcuType);

    if (props.mcuType === 'stm') {
      const result = await window.electronAPI.writeStmFirmware(
        firmwarePath.value,
        props.stmMcu || 'stm8s103f3',
        (p: number) => {
          progress.value = p;
        },
      );
      if (!result.success) {
        console.error('STM firmware write failed:', result.error);
      } else {
        console.log('STM firmware written successfully!');
      }
    } else if (props.mcuType === 'esp32') {
      const result = await window.electronAPI.writeEsp32Firmware(
        firmwarePath.value,
        props.port || '',
        (p: number) => {
          progress.value = p;
        },
      );
      if (!result.success) {
        console.error('ESP32 firmware write failed:', result.error);
      } else {
        console.log('ESP32 firmware written successfully!');
      }
    }

    progress.value = 0;
  } catch (err) {
    console.error('Firmware download error:', err);
  }
};
</script>

<template>
  <q-card class="serial-port-manager">
    <q-card-section>
      <div class="text-h6">UART {{ portId }} Communication</div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Port Selection -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-6">
          <q-select
            v-model="selectedPort"
            :options="portOptions"
            label="Select COM Port"
            :disable="isConnected"
            outlined
            dense
            emit-value
            map-options
          >
            <template v-slot:prepend>
              <q-icon name="usb" />
            </template>
          </q-select>
        </div>
        <div class="col-3">
          <q-select
            v-model="baudRate"
            :options="baudRateOptions"
            label="Baud Rate"
            :disable="isConnected"
            outlined
            dense
          />
        </div>
        <div class="col-3">
          <q-btn
            :label="isConnected ? 'Disconnect' : 'Connect'"
            :color="isConnected ? 'negative' : 'positive'"
            :loading="isLoading"
            @click="isConnected ? disconnect() : connect()"
            class="full-width"
          />
        </div>
      </div>

      <div class="row q-mb-md">
        <div class="col">
          <q-btn
            label="Refresh Ports"
            icon="refresh"
            outline
            color="primary"
            :disable="isConnected"
            :loading="isLoading"
            @click="listPorts"
          />
        </div>
      </div>

      <!-- Error Display -->
      <q-banner v-if="error" class="bg-negative text-white q-mb-md" dense>
        <template v-slot:avatar>
          <q-icon name="error" color="white" />
        </template>
        {{ error }}
      </q-banner>

      <!-- Connection Status -->
      <q-banner :class="isConnected ? 'bg-positive' : 'bg-grey-4'" class="text-white q-mb-md" dense>
        <template v-slot:avatar>
          <q-icon
            :name="isConnected ? 'wifi' : 'wifi_off'"
            :color="isConnected ? 'white' : 'grey-7'"
          />
        </template>
        <span :class="isConnected ? 'text-white' : 'text-grey-7'">
          {{ isConnected ? `Connected to ${selectedPort}` : 'Not connected' }}
        </span>
      </q-banner>

      <!-- Send Data -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-9">
          <q-input
            v-model="dataToSend"
            label="Data to Send"
            outlined
            dense
            :disable="!isConnected"
            @keyup.enter="handleSend"
          >
            <template v-slot:prepend>
              <q-icon name="send" />
            </template>
          </q-input>
        </div>
        <div class="col-3">
          <q-btn
            label="Send"
            color="primary"
            :disable="!isConnected || !dataToSend"
            @click="handleSend"
            class="full-width"
          />
        </div>
      </div>

      <!-- Received Data -->
      <div class="q-mb-md">
        <div class="row items-center q-mb-sm">
          <div class="col text-subtitle2">Received Data:</div>
          <div class="col-auto">
            <q-btn
              icon="clear"
              flat
              round
              dense
              size="sm"
              @click="clearReceivedData"
              :disable="!receivedData"
            >
              <q-tooltip>Clear</q-tooltip>
            </q-btn>
          </div>
        </div>
        <q-input
          v-model="receivedData"
          type="textarea"
          outlined
          readonly
          rows="8"
          bg-color="grey-2"
          class="monospace-text"
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useSerialPort } from 'src/composables/useSerialPort';

const props = defineProps<{
  portId: number;
  title?: string;
}>();

const {
  ports,
  selectedPort,
  baudRate,
  isConnected,
  receivedData,
  error,
  isLoading,
  listPorts,
  connect,
  disconnect,
  sendData,
  clearReceivedData,
} = useSerialPort(props.portId);

const dataToSend = ref<string>('');

const baudRateOptions = [9600, 19200, 38400, 57600, 115200];

const portOptions = computed(() => {
  return ports.value.map((port) => ({
    label: `${port.path}${port.manufacturer ? ' - ' + port.manufacturer : ''}`,
    value: port.path,
  }));
});

const handleSend = async () => {
  if (dataToSend.value) {
    await sendData(dataToSend.value + '\n');
    dataToSend.value = '';
  }
};

onMounted(() => {
  void listPorts();
});
</script>

<style scoped>
.serial-port-manager {
  width: 100%;
}

.monospace-text :deep(textarea) {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
</style>

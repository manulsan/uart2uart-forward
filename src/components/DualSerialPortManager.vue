<template>
  <q-card class="dual-serial-manager bg-grey-6">
    <!-- <q-card-section>
      <div class="text-h6">Dual UART Communication</div>
      <div class="text-caption">UART1 → Process Data → UART2</div>
    </q-card-section> -->

    <q-separator />
    <McuSelection v-model="showMcuDialog" @select="handleMcuSelect" @cancel="handleMcuCancel" />
    <ComPortSelection
      v-if="selectedMcu === 'esp32'"
      v-model="showPortDialog"
      :mcu-type="selectedMcu"
      :port-options="portOptions"
      @select="handlePortSelect"
      @cancel="handlePortCancel"
    />
    <div
      v-if="(selectedMcu === 'stm' && selectedStmMcu) || (selectedMcu === 'esp32' && selectedPort)"
      class="q-px-sm q-pt-sm"
    >
      <FirmwareWriter
        :mcu-type="selectedMcu"
        :port="selectedPort"
        @close="
          selectedMcu = '';
          selectedPort = '';
        "
      />
    </div>

    <q-card-section class="q-pa-sm">
      <div class="row q-col-gutter-xs">
        <!-- UART 1 Configuration -->

        <div v-if="uartMode === 'dual'" class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="row q-col-gutter-sm q-mb-xs">
                <div class="col-6">
                  <q-select
                    v-model="port1.selectedPort"
                    :options="portOptions"
                    label="Select UART 1 Port"
                    :disable="port1.isConnected"
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
                    v-model="port1.baudRate"
                    :options="baudRateOptions"
                    label="Baud Rate"
                    :disable="port1.isConnected"
                    outlined
                    dense
                  />
                </div>

                <div class="col-3">
                  <q-btn
                    :label="port1.isConnected ? 'Disconnect' : 'Connect'"
                    :color="port1.isConnected ? 'negative' : 'positive'"
                    :loading="port1.isLoading"
                    @click="port1.isConnected ? disconnect(1) : connect(1)"
                    class="full-width"
                  />
                </div>
              </div>

              <q-banner
                :class="port1.isConnected ? 'bg-positive q-ma-none' : 'bg-grey-4 q-q-ma-none'"
                class="text-white q-ma-none q-pa-xs"
                dense
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="port1.isConnected ? 'wifi' : 'wifi_off'"
                    :color="port1.isConnected ? 'white' : 'grey-7'"
                    size="sm"
                  />
                </template>
                <span :class="port1.isConnected ? 'text-white  q-pa-xs' : 'text-grey-7 q-pa-xs'">
                  {{ port1.isConnected ? `Connected: ${port1.selectedPort}` : 'Not connected' }}
                </span>
              </q-banner>

              <q-banner v-if="port1.error" class="bg-negative text-white q-mt-sm" dense>
                <template v-slot:avatar>
                  <q-icon name="error" color="white" />
                </template>
                {{ port1.error }}
              </q-banner>

              <div class="q-mt-sm">
                <div class="row items-center q-mb-none">
                  <div class="col text-caption text-weight-bold">Received Data:</div>
                  <div class="col-auto">
                    <q-btn label="Clear" flat dense size="sm" @click="port1.receivedData = ''" />
                  </div>
                </div>
                <q-input
                  v-model="port1.receivedData"
                  type="textarea"
                  outlined
                  readonly
                  bg-color="grey-2"
                  class="monospace-text"
                  input-style="min-height: 350px; resize: vertical"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- UART 2 Configuration -->
        <div :class="uartMode === 'single' ? 'col-8' : 'col-12 col-md-6'">
          <q-card flat bordered>
            <q-card-section>
              <div class="row q-col-gutter-sm q-mb-xs">
                <div class="col-6">
                  <q-select
                    v-model="port2.selectedPort"
                    :options="portOptions"
                    label="Select UART 2 Port"
                    :disable="port2.isConnected"
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
                    v-model="port2.baudRate"
                    :options="baudRateOptions"
                    label="Baud Rate"
                    :disable="port2.isConnected"
                    outlined
                    dense
                  />
                </div>

                <div class="col-3">
                  <q-btn
                    :label="port2.isConnected ? 'Disconnect' : 'Connect'"
                    :color="port2.isConnected ? 'negative' : 'positive'"
                    :loading="port2.isLoading"
                    @click="port2.isConnected ? disconnect(2) : connect(2)"
                    class="full-width"
                  />
                </div>
              </div>

              <q-banner
                :class="port2.isConnected ? 'bg-positive' : 'bg-grey-4'"
                class="text-white q-ma-none q-pa-xs"
                dense
              >
                <template v-slot:avatar>
                  <q-icon
                    :name="port2.isConnected ? 'wifi' : 'wifi_off'"
                    :color="port2.isConnected ? 'white' : 'grey-7'"
                    size="sm"
                  />
                </template>
                <span :class="port2.isConnected ? 'text-white' : 'text-grey-7'">
                  {{ port2.isConnected ? `Connected: ${port2.selectedPort}` : 'Not connected' }}
                </span>
              </q-banner>

              <q-banner v-if="port2.error" class="bg-negative text-white q-mt-sm" dense>
                <template v-slot:avatar>
                  <q-icon name="error" color="white" />
                </template>
                {{ port2.error }}
              </q-banner>

              <div class="q-mt-sm">
                <div class="row items-center q-mb-none">
                  <div class="col text-caption text-weight-bold">Sent Data:</div>
                  <div class="col-auto">
                    <q-checkbox
                      v-model="uart2TxShowTimeStamp"
                      dense
                      size="xs"
                      label="TIMESTAMP"
                      class="q-ml-sm text-font-weight-bold"
                      style="font-size: 10px"
                    />
                    <!-- :disable="!port1.isConnected || !port2.isConnected" -->
                    <q-btn
                      label="Clear"
                      icon="clear"
                      flat
                      dense
                      size="sm"
                      @click="port2.sentData = ''"
                    />
                  </div>
                </div>
                <q-input
                  v-model="port2.sentData"
                  type="textarea"
                  outlined
                  readonly
                  bg-color="grey-2"
                  class="monospace-text"
                  input-style="min-height: 160px; resize: vertical"
                />
              </div>

              <div class="q-mt-sm">
                <div class="row items-center q-mb-none">
                  <div class="col text-caption text-weight-bold">Received Data:</div>
                  <div class="col-auto">
                    <q-checkbox
                      v-model="uart2RxShowTimeStamp"
                      dense
                      size="xs"
                      label="TIMESTAMP"
                      class="q-ml-sm text-font-weight-"
                      style="font-size: 10px"
                    />
                    <q-btn
                      label="Clear"
                      icon="clear"
                      flat
                      dense
                      size="sm"
                      @click="port2.receivedData = ''"
                    />
                  </div>
                </div>
                <q-input
                  v-model="port2.receivedData"
                  type="textarea"
                  outlined
                  readonly
                  bg-color="grey-2"
                  class="monospace-text"
                  input-style="min-height: 153px; resize: vertical"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Transmit Macros Card (Single Mode Only) -->
        <div v-if="uartMode === 'single'" class="col-4">
          <q-card flat bordered>
            <q-card-section class="q-pa-sm">
              <div class="row q-col-gutter-xs q-mb-sm">
                <div class="text-subtitle2 q-mb-xs">Transmit Macros</div>
                <div class="col-auto">
                  <q-btn label="Load" size="sm" dense @click="loadMacros" />
                </div>
                <div class="col-auto">
                  <q-btn label="Save" size="sm" dense @click="saveMacros" />
                </div>
              </div>

              <q-scroll-area style="height: 600px" :thumb-style="{ right: '2px', width: '5px' }">
                <div v-for="(macro, index) in macros" :key="index" class="q-mb-xs q-pr-sm">
                  <div class="row q-col-gutter-xs items-center">
                    <div class="col">
                      <q-input v-model="macro.label" dense outlined placeholder="cmd" />
                    </div>
                    <div class="col-auto" style="width: 85px">
                      <q-input
                        v-model.number="macro.timer"
                        type="number"
                        dense
                        outlined
                        class="q-pa-none"
                      />
                    </div>
                    <div class="col-auto" style="width: 30px">
                      <q-btn
                        dense
                        size="md"
                        label="TX"
                        class="text-subtitle"
                        :disable="!port2.isConnected"
                        @click="sendMacro(macro.label)"
                      />
                    </div>
                    <div class="col-auto">
                      <q-checkbox
                        v-model="macro.enabled"
                        dense
                        size="sm"
                        label="AutoTX"
                        class="text-subtitle"
                      />
                    </div>
                  </div>
                </div>
              </q-scroll-area>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Control Panel -->
      <div class="q-mt-sm">
        <q-card flat bordered>
          <q-card-section class="q-pa-sm">
            <!-- <div class="text-subtitle2 q-mb-md">Control Panel</div> -->

            <div v-if="uartMode === 'dual'" class="row q-col-gutter-md items-center">
              <div class="col-auto">
                <q-toggle
                  v-model="autoForward"
                  label="Auto Forward (UART1 → UART2)"
                  color="primary"
                  :disable="!port1.isConnected || !port2.isConnected"
                />
              </div>

              <div class="col">
                <q-input
                  v-model="dataPrefix"
                  label="Data Prefix (optional)"
                  outlined
                  dense
                  placeholder="e.g., ID:"
                />
              </div>

              <div class="col">
                <q-input
                  v-model="dataSuffix"
                  label="Data Suffix (optional)"
                  outlined
                  dense
                  placeholder="e.g., \\r\\n"
                />
              </div>
            </div>

            <div class="q-mt-sm">
              <div class="text-caption q-my-none">To UART2 (Manually) :</div>
              <div class="row q-col-gutter-sm">
                <div class="col">
                  <q-input
                    v-model="manualData"
                    label="Data to send"
                    outlined
                    dense
                    :disable="!port2.isConnected"
                    @keyup.enter="sendManualData"
                  />
                </div>
                <div class="col-auto">
                  <q-btn
                    label="Send"
                    color="primary"
                    :disable="!port2.isConnected || !manualData"
                    @click="sendManualData"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Statistics -->
      <div v-if="uartMode === 'dual'" class="q-mt-sm">
        <q-card flat bordered>
          <q-card-section class="q-pa-sm">
            <!-- <div class="text-subtitle2 q-pa-none q-mb-sm">Statistics</div> -->
            <div class="row q-col-gutter-md text-center items-center">
              <div class="col">
                <div class="text-h6">{{ stats.receivedCount }}</div>
                <div class="text-caption">UART1 Received</div>
              </div>
              <div class="col">
                <div class="text-h6">{{ stats.forwardedCount }}</div>
                <div class="text-caption">Forwarded to UART2</div>
              </div>
              <div class="col">
                <div class="text-h6">{{ stats.manualSentCount }}</div>
                <div class="text-caption">Manual Sent</div>
              </div>
              <div class="col-auto">
                <q-btn icon="refresh" flat round dense @click="resetStats">
                  <q-tooltip>Reset Statistics</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Firmware Writing Card -->
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import FirmwareWriter from './FirmwareWriter.vue';
import ComPortSelection from './ComPortSelection.vue';
import McuSelection from './McuSelection.vue';

interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

interface PortState {
  selectedPort: string;
  baudRate: number;
  isConnected: boolean;
  receivedData: string;
  sentData: string;
  error: string;
  isLoading: boolean;
}

interface Macro {
  command: string;
  label: string;
  timer: number;
  enabled: boolean;
  intervalId?: ReturnType<typeof setInterval>;
}

const ports = ref<PortInfo[]>([]);
const isLoadingPorts = ref(false);

const macros = ref<Macro[]>([
  { command: 'help$0D', label: 'help', timer: 1000, enabled: false },
  { command: 'info$0D', label: 'info', timer: 1000, enabled: false },
  { command: 'sn 0001QAFF00251200000001$0D', label: 'sn', timer: 1000, enabled: false },
  { command: 'securitymode pressed$0d', label: 'but-p', timer: 1000, enabled: false },
  { command: 'securitymode released$0d', label: 'but-R', timer: 1000, enabled: false },
  { command: 'light$0D', label: 'light', timer: 1000, enabled: false },
  { command: 'light on 1$0D', label: 'light o', timer: 1000, enabled: false },
  { command: 'sensor add 1[eee]$0D', label: 'S1', timer: 1000, enabled: false },
  { command: 'sensor add 1[eee2 sensor:2$0D', label: 'S2', timer: 1000, enabled: false },
  { command: 'beep on 10$0d', label: 'beep', timer: 1000, enabled: false },
  { command: 'melody on $0d', label: 'meloc', timer: 1000, enabled: false },
  { command: 'sensor', label: 'senso', timer: 1000, enabled: false },
  { command: 'ssid set DAMOSYS$0d', label: 'w-ssic', timer: 1000, enabled: false },
  { command: 'pass set damo8864$0d', label: 'w-pas', timer: 1000, enabled: false },
  { command: 'dsurl atcloud.com$0d', label: 's-url', timer: 1000, enabled: false },
  { command: 'dsport 443$0d', label: 's-port', timer: 1000, enabled: false },
  { command: 'clear$0D', label: 'clear', timer: 1000, enabled: false },
  { command: 'echo$0D', label: 'echo', timer: 1000, enabled: false },
  { command: 'ssid$0D', label: '', timer: 1000, enabled: false },
  {
    command: 'ota http://192.168.123.170:8000/firmware_e',
    label: 'ota',
    timer: 1000,
    enabled: false,
  },
  { command: 'save$0D', label: 'save', timer: 1000, enabled: false },
  { command: 'sensor delete 1FEEE1$0D', label: 'DS', timer: 1000, enabled: false },
  { command: 'reboot$0D', label: 'reboot', timer: 1000, enabled: false },
  { command: 'frr$0D', label: 'FR', timer: 1000, enabled: false },
]);
const autoForward = ref(true);
const dataPrefix = ref('');
const dataSuffix = ref('\r\n');
const manualData = ref('');
const uartMode = ref<'single' | 'dual'>('dual');
const uart2RxShowTimeStamp = ref(false);
const uart2TxShowTimeStamp = ref(false);
const selectedMcu = ref<'stm' | 'esp32' | ''>('');
const selectedPort = ref<string>('');
const selectedStmMcu = ref<string>('');
const showPortDialog = ref(false);
const showMcuDialog = ref(false);

const baudRateOptions = [9600, 19200, 38400, 57600, 115200];

const port1 = reactive<PortState>({
  selectedPort: '',
  baudRate: 115200,
  isConnected: false,
  receivedData: '',
  sentData: '',
  error: '',
  isLoading: false,
});

const port2 = reactive<PortState>({
  selectedPort: '',
  baudRate: 115200,
  isConnected: false,
  receivedData: '',
  sentData: '',
  error: '',
  isLoading: false,
});

const stats = reactive({
  receivedCount: 0,
  forwardedCount: 0,
  manualSentCount: 0,
});

const portOptions = computed(() => {
  return ports.value.map((port) => ({
    label: `${port.path}${port.manufacturer ? ' - ' + port.manufacturer : ''}`,
    value: port.path,
  }));
});

const getTimestamp = (): string => {
  const now = new Date();
  return `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;
};

const listPorts = async () => {
  try {
    isLoadingPorts.value = true;
    const result = await window.serialAPI.listPorts();

    if (result.success && result.ports) {
      ports.value = result.ports;
    } else {
      console.error('Failed to list ports:', result.error);
    }
  } catch (err) {
    console.error('Error listing ports:', err);
  } finally {
    isLoadingPorts.value = false;
  }
};

const processData = (data: string): string => {
  // 데이터 가공 로직
  let processed = data;

  // prefix 추가
  if (dataPrefix.value) {
    processed = dataPrefix.value + processed;
  }

  // suffix 추가 (escape 문자 처리)
  if (dataSuffix.value) {
    const suffix = dataSuffix.value
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t');
    processed = processed + suffix;
  }

  return processed;
};

const forwardData = async (data: string) => {
  if (!port2.isConnected || !autoForward.value) {
    return;
  }

  try {
    const processedData = processData(data);
    const result = await window.serialAPI.write(2, processedData);

    if (result.success) {
      port2.sentData = processedData + port2.sentData;
      stats.forwardedCount++;
    } else {
      port2.error = result.error || 'Failed to forward data';
    }
  } catch (err) {
    port2.error = (err as Error).message;
  }
};

let port2RxLineBuffer = '';
let port2RxIsNewLine = true;
let port1RxLineBuffer = '';

// Helper function to find and extract the first complete line from buffer
const extractFirstLine = (buffer: string): { line: string; remaining: string } | null => {
  const lfIndex = buffer.indexOf('\n');
  const crIndex = buffer.indexOf('\r');

  if (lfIndex === -1 && crIndex === -1) {
    return null; // No line ending found
  }

  let lineEndIndex = -1;
  let lineEndLength = 1;

  if (lfIndex >= 0 && crIndex >= 0) {
    // Both exist, use whichever comes first
    lineEndIndex = Math.min(lfIndex, crIndex);
    // Check for \r\n or \n\r
    if (
      (buffer[lineEndIndex] === '\r' && buffer[lineEndIndex + 1] === '\n') ||
      (buffer[lineEndIndex] === '\n' && buffer[lineEndIndex + 1] === '\r')
    ) {
      lineEndLength = 2;
    }
  } else {
    lineEndIndex = lfIndex >= 0 ? lfIndex : crIndex;
  }

  const line = buffer.substring(0, lineEndIndex + lineEndLength);
  const remaining = buffer.substring(lineEndIndex + lineEndLength);

  return { line, remaining };
};

const connect = async (portId: number) => {
  const portState = portId === 1 ? port1 : port2;

  if (!portState.selectedPort) {
    portState.error = 'Please select a port';
    return;
  }

  try {
    portState.isLoading = true;
    portState.error = '';
    const result = await window.serialAPI.open(portId, portState.selectedPort, portState.baudRate);

    if (result.success) {
      portState.isConnected = true;

      // Setup data listener for port 1
      if (portId === 1) {
        window.serialAPI.onData(1, (data: string) => {
          port1RxLineBuffer += data;

          // Process all complete lines in buffer
          let result = extractFirstLine(port1RxLineBuffer);
          while (result) {
            // Prepend complete line to display
            port1.receivedData = result.line + port1.receivedData;

            const lineToForward = result.line.replace(/[\r\n]+$/, ''); // Trim line endings for forwarding
            void forwardData(lineToForward);
            stats.receivedCount++;
            port1RxLineBuffer = result.remaining;
            result = extractFirstLine(port1RxLineBuffer);
          }
        });
      }
      // Setup data listener for port 2
      if (portId === 2) {
        window.serialAPI.onData(2, (data: string) => {
          if (uart2RxShowTimeStamp.value) {
            // Process data character by character to detect line endings
            for (let i = 0; i < data.length; i++) {
              const char = data[i];

              if (char === '\n' || char === '\r') {
                // Line ending found - output the buffered line with its ending
                let lineWithEnding = port2RxLineBuffer + char;

                // Skip \n if we just processed \r and next char is \n (handle \r\n)
                if (char === '\n' && i + 1 < data.length && data[i + 1] === '\r') {
                  lineWithEnding += data[i + 1];
                  i++; // Skip the extra character
                }

                // Prepend complete line to display
                port2.receivedData = lineWithEnding + port2.receivedData;
                port2RxLineBuffer = '';
                port2RxIsNewLine = true;
              } else {
                // Regular character
                if (port2RxIsNewLine) {
                  // Only add timestamp if this looks like a new message (starts with specific patterns)
                  // Peek ahead to check if line starts with RX:, [SocketIO], or other message markers
                  const remainingData = data.substring(i);
                  const isNewMessage = /^(RX:|TX:|\[SocketIO\]|\[)/.test(remainingData);

                  if (isNewMessage) {
                    port2RxLineBuffer = getTimestamp() + ' ' + char;
                  } else {
                    port2RxLineBuffer = char || '';
                  }
                  port2RxIsNewLine = false;
                } else {
                  port2RxLineBuffer += char;
                }
              }
            }
          } else {
            port2.receivedData = data + port2.receivedData;
          }
        });
      }
    } else {
      portState.error = result.error || 'Failed to open port';
    }
  } catch (err) {
    portState.error = (err as Error).message;
  } finally {
    portState.isLoading = false;
  }
};

const disconnect = async (portId: number) => {
  const portState = portId === 1 ? port1 : port2;

  try {
    portState.isLoading = true;
    portState.error = '';
    const result = await window.serialAPI.close(portId);

    if (result.success) {
      portState.isConnected = false;
      window.serialAPI.removeDataListener(portId);
    } else {
      portState.error = result.error || 'Failed to close port';
    }
  } catch (err) {
    portState.error = (err as Error).message;
  } finally {
    portState.isLoading = false;
  }
};

const sendManualData = async () => {
  if (!manualData.value || !port2.isConnected) {
    return;
  }

  try {
    const processedData = processData(manualData.value);
    const result = await window.serialAPI.write(2, processedData);

    if (result.success) {
      if (uart2TxShowTimeStamp.value) {
        const timestamp = getTimestamp();
        port2.sentData = `${timestamp} ${processedData}` + port2.sentData;
      } else port2.sentData = processedData + port2.sentData;
      stats.manualSentCount++;
      manualData.value = '';
    } else {
      port2.error = result.error || 'Failed to send data';
    }
  } catch (err) {
    port2.error = (err as Error).message;
  }
};

const sendMacro = async (data: string) => {
  if (!data || !port2.isConnected) {
    return;
  }

  try {
    const processedData = processData(data);
    const result = await window.serialAPI.write(2, processedData);

    if (result.success) {
      port2.sentData = processedData + port2.sentData;
      stats.manualSentCount++;
    } else {
      port2.error = result.error || 'Failed to send macro';
    }
  } catch (err) {
    port2.error = (err as Error).message;
  }
};

const startMacroInterval = (macro: Macro, index: number) => {
  if (macro.intervalId) {
    clearInterval(macro.intervalId);
  }

  macro.intervalId = setInterval(() => {
    if (macro.enabled && port2.isConnected) {
      void sendMacro(macro.label);
    } else {
      stopMacroInterval(index);
    }
  }, macro.timer);
};

const stopMacroInterval = (index: number) => {
  const macro = macros.value[index];
  if (macro && macro.intervalId) {
    clearInterval(macro.intervalId);
    delete macro.intervalId;
  }
};

const stopAllMacroIntervals = () => {
  macros.value.forEach((_, index) => {
    stopMacroInterval(index);
  });
};

const resetStats = () => {
  stats.receivedCount = 0;
  stats.forwardedCount = 0;
  stats.manualSentCount = 0;
};

const loadMacros = async () => {
  try {
    const result = await window.electronAPI.loadMacros();

    if (result.success && result.macros) {
      macros.value = result.macros as Macro[];
      console.log('Macros loaded successfully from:', result.filePath);
    } else if (result.cancelled) {
      console.log('Load cancelled');
    } else {
      console.error('Failed to load macros:', result.error);
    }
  } catch (err) {
    console.error('Error loading macros:', err);
  }
};

const saveMacros = async () => {
  console.log('saveMacros called, macros:', macros.value);
  try {
    // Convert Vue reactive proxy to plain JavaScript object
    const plainMacros = JSON.parse(JSON.stringify(macros.value));
    const result = await window.electronAPI.saveMacros(plainMacros);

    if (result.success) {
      console.log('Macros saved successfully to:', result.filePath);
    } else if (result.cancelled) {
      console.log('Save cancelled');
    } else {
      console.error('Failed to save macros:', result.error);
    }
  } catch (err) {
    console.error('Error saving macros:', err);
  }
};

const saveConfig = async () => {
  try {
    const config = {
      dataPrefix: dataPrefix.value,
      dataSuffix: dataSuffix.value,
      port1: {
        selectedPort: port1.selectedPort,
        baudRate: port1.baudRate,
      },
      port2: {
        selectedPort: port2.selectedPort,
        baudRate: port2.baudRate,
      },
      autoForward: autoForward.value,
    };

    const result = await window.electronAPI.saveConfig(config);

    if (result.success) {
      console.log('Config saved successfully to:', result.filePath);
    } else if (result.cancelled) {
      console.log('Save cancelled');
    } else {
      console.error('Failed to save config:', result.error);
    }
  } catch (err) {
    console.error('Error saving config:', err);
  }
};

const loadConfig = async () => {
  try {
    const result = await window.electronAPI.loadConfig();

    if (result.success && result.config) {
      dataPrefix.value = result.config.dataPrefix || '';
      dataSuffix.value = result.config.dataSuffix || '\r\n';

      // Restore UART settings
      if (result.config.port1) {
        port1.selectedPort = result.config.port1.selectedPort || '';
        port1.baudRate = result.config.port1.baudRate || 115200;
      }
      if (result.config.port2) {
        port2.selectedPort = result.config.port2.selectedPort || '';
        port2.baudRate = result.config.port2.baudRate || 115200;
      }
      if (result.config.autoForward !== undefined) {
        autoForward.value = result.config.autoForward;
      }

      console.log('Config loaded successfully from:', result.filePath);
    } else if (result.cancelled) {
      console.log('Load cancelled');
    } else {
      console.error('Failed to load config:', result.error);
    }
  } catch (err) {
    console.error('Error loading config:', err);
  }
};

const openEsp32PortDialog = async () => {
  if (portOptions.value.length === 0) {
    await listPorts();
  }

  if (portOptions.value.length === 0) {
    console.error('No UART ports available');
    return;
  }

  selectedMcu.value = 'esp32';
  showPortDialog.value = true;
};

const handlePortSelect = (port: string) => {
  selectedPort.value = port;
  console.log('Selected ESP32 port:', port);
};

const handlePortCancel = () => {
  selectedMcu.value = '';
  console.log('ESP32 port selection cancelled');
};

const openStmMcuDialog = () => {
  showMcuDialog.value = true;
};

const handleMcuSelect = (mcu: string) => {
  selectedStmMcu.value = mcu;
  selectedMcu.value = 'stm';
  console.log('Selected STM MCU:', mcu);
};

const handleMcuCancel = () => {
  console.log('STM MCU selection cancelled');
};

onMounted(() => {
  void listPorts();

  // Listen for menu refresh command
  window.electronAPI?.onMenuRefreshPorts?.(() => {
    void listPorts();
  });

  // Listen for menu load config command
  window.electronAPI?.onMenuLoadConfig?.(() => {
    void loadConfig();
  });

  // Listen for menu save config command
  window.electronAPI?.onMenuSaveConfig?.(() => {
    void saveConfig();
  });

  // Listen for UART mode change
  window.electronAPI?.onMenuUartMode?.((mode: string) => {
    uartMode.value = mode as 'single' | 'dual';
    console.log('UART mode changed to:', mode);

    // Disconnect all connected ports when mode changes
    if (port1.isConnected) {
      void disconnect(1);
    }
    if (port2.isConnected) {
      void disconnect(2);
    }
  });

  // Listen for firmware writing menu
  window.electronAPI?.onMenuFirmwareStm?.(() => {
    openStmMcuDialog();
  });

  window.electronAPI?.onMenuFirmwareEsp32?.(() => {
    // Show port selection dialog for ESP32
    void openEsp32PortDialog();
  });

  // Watch for macro enabled state changes
  macros.value.forEach((macro, index) => {
    watch(
      () => macro.enabled,
      (enabled) => {
        if (enabled && port2.isConnected && macro.timer > 0) {
          startMacroInterval(macro, index);
        } else {
          stopMacroInterval(index);
        }
      },
    );
  });

  // Watch for UART2 connection state
  watch(
    () => port2.isConnected,
    (connected) => {
      if (!connected) {
        stopAllMacroIntervals();
      } else {
        // Restart intervals for enabled macros when reconnected
        macros.value.forEach((macro, index) => {
          if (macro.enabled && macro.timer > 0) {
            startMacroInterval(macro, index);
          }
        });
      }
    },
  );
});

onUnmounted(() => {
  stopAllMacroIntervals();
});
</script>

<style scoped>
.dual-serial-manager {
  width: 100%;
}

.monospace-text :deep(textarea) {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
</style>

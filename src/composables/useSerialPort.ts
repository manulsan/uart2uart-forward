import { ref, onUnmounted } from 'vue';

interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export function useSerialPort(portId: number = 1) {
  const ports = ref<PortInfo[]>([]);
  const selectedPort = ref<string>('');
  const baudRate = ref<number>(9600);
  const isConnected = ref<boolean>(false);
  const receivedData = ref<string>('');
  const error = ref<string>('');
  const isLoading = ref<boolean>(false);

  const listPorts = async () => {
    try {
      isLoading.value = true;
      error.value = '';
      const result = await window.serialAPI.listPorts();

      if (result.success && result.ports) {
        ports.value = result.ports;
      } else {
        error.value = result.error || 'Failed to list ports';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  };

  const connect = async () => {
    if (!selectedPort.value) {
      error.value = 'Please select a port';
      return;
    }

    try {
      isLoading.value = true;
      error.value = '';
      const result = await window.serialAPI.open(portId, selectedPort.value, baudRate.value);

      if (result.success) {
        isConnected.value = true;

        // Setup data listener
        window.serialAPI.onData(portId, (data: string) => {
          receivedData.value += data;
        });
      } else {
        error.value = result.error || 'Failed to open port';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  };

  const disconnect = async () => {
    try {
      isLoading.value = true;
      error.value = '';
      const result = await window.serialAPI.close(portId);

      if (result.success) {
        isConnected.value = false;
        window.serialAPI.removeDataListener(portId);
      } else {
        error.value = result.error || 'Failed to close port';
      }
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  };

  const sendData = async (data: string) => {
    if (!isConnected.value) {
      error.value = 'Not connected to any port';
      return;
    }

    try {
      error.value = '';
      const result = await window.serialAPI.write(portId, data);

      if (!result.success) {
        error.value = result.error || 'Failed to send data';
      }
    } catch (err) {
      error.value = (err as Error).message;
    }
  };

  const clearReceivedData = () => {
    receivedData.value = '';
  };

  // Cleanup on unmount
  onUnmounted(() => {
    if (isConnected.value) {
      void window.serialAPI.close(portId);
      window.serialAPI.removeDataListener(portId);
    }
  });

  return {
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
  };
}

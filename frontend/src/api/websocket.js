class TelemetryWebSocket {
  constructor() {
    this.ws = null;
    this.subscribers = new Set();
    this.reconnectTimer = null;
    this.pingInterval = null;
    this.isConnected = false;
    this.lastData = {};
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend telemetry WebSocket hub is hosted on port 91 (uvicorn FastAPI backend)
    const wsHost = `${window.location.hostname || '127.0.0.1'}:91`;
    const url = `${protocol}//${wsHost}/ws/telemetry`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.tags) {
            this.lastData = { ...this.lastData, ...payload.tags };
            this.notifyData(payload.tags);
          }
          if (payload.event === 'device_health_update') {
            this.notifyData({ _device_health_update: payload });
          } else if (payload.event === 'device_telemetry' || payload.device_id || payload.device) {
            this.notifyData({ _device_telemetry: payload });
          }
        } catch (err) {
          console.warn('WS parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this.cleanup();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  startHeartbeat() {
    clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 15000);
  }

  cleanup() {
    this.isConnected = false;
    this.notifyStatus(false);
    clearInterval(this.pingInterval);
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.close(); } catch (_) {}
      }
      this.ws = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    // Immediately send last known snapshot if available
    if (Object.keys(this.lastData).length > 0) {
      callback(this.lastData);
    }
    return () => this.subscribers.delete(callback);
  }

  notifyData(tags) {
    this.subscribers.forEach((cb) => cb(tags));
  }

  notifyStatus(status) {
    window.dispatchEvent(new CustomEvent('ws-status-change', { detail: { connected: status } }));
  }
}

export const telemetryWS = new TelemetryWebSocket();

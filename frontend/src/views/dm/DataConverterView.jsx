import React, { useState, useEffect } from 'react';
import { 
  Code2, Play, RefreshCw, Check, Copy, CheckCheck, 
  Plus, Terminal, FileCode, Layers, Zap, Download,
  ArrowRight, Shield, Activity, Settings, Cpu
} from 'lucide-react';
import { useDM } from './dmContext';

export default function DataConverterView() {
  const { showToast } = useDM();

  const [converters, setConverters] = useState([]);
  const [selectedConverterId, setSelectedConverterId] = useState(null);
  const [scriptCode, setScriptCode] = useState('');
  const [testPayload, setTestPayload] = useState('');
  const [converterType, setConverterType] = useState('UPLINK');
  const [converterName, setConverterName] = useState('');
  
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    fetchConverters();
  }, []);

  const fetchConverters = async () => {
    try {
      const res = await fetch('/api/v1/dm/converters');
      const data = await res.json();
      setConverters(data);
      if (data.length > 0 && !selectedConverterId) {
        selectConverter(data[0]);
      }
    } catch (e) {
      console.error("Failed to load converters:", e);
    }
  };

  const selectConverter = (conv) => {
    setSelectedConverterId(conv.id);
    setConverterName(conv.name);
    setConverterType(conv.type);
    setScriptCode(conv.script);
    setTestPayload(conv.sample_payload);
    setTestResult(null);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestRun = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/v1/dm/converters/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          converter_id: selectedConverterId,
          type: converterType,
          payload: testPayload,
          script: scriptCode
        })
      });
      const data = await res.json();
      setTestResult(data);
      if (data.status === 'SUCCESS') {
        showToast(`Converter test executed in ${data.execution_time_ms}ms!`, 'success');
      } else {
        showToast('Converter test execution error', 'error');
      }
    } catch (e) {
      showToast('Execution error: ' + e.message, 'error');
      setTestResult({ status: 'ERROR', error: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConverter = () => {
    setConverters(prev => prev.map(c => {
      if (c.id === selectedConverterId) {
        return {
          ...c,
          name: converterName,
          type: converterType,
          script: scriptCode,
          sample_payload: testPayload
        };
      }
      return c;
    }));
    showToast(`Data Converter '${converterName}' saved and deployed to engine!`, 'success');
  };

  return (
    <div className="dm-entity-container">
      {/* Page Header */}
      <div className="dm-entity-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="dm-page-title">ThingsBoard PE Data Converters Studio</h2>
            <span style={{ fontSize: '0.65rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              ENTERPRISE INTEGRATION ENGINE
            </span>
          </div>
          <p className="dm-page-subtitle">
            Configure Uplink (Decoder) and Downlink (Encoder) converter scripts to normalize industrial payloads into ThingsBoard Timeseries and Attributes.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="dm-btn dm-btn-secondary"
            onClick={fetchConverters}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} />
            <span>Reload Converters</span>
          </button>
          <button
            className="dm-btn dm-btn-primary"
            onClick={handleSaveConverter}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={14} />
            <span>Save & Deploy Converter</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 380px', gap: '16px', height: 'calc(100vh - 210px)' }}>
        
        {/* Column 1: Converter List */}
        <div style={{
          background: '#070a11',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Data Converters Library</span>
            <span className="mono" style={{ fontSize: '0.68rem', color: '#38bdf8' }}>{converters.length} Available</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
            {converters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b' }}>
                <Code2 size={24} style={{ margin: '0 auto 8px', color: '#475569' }} />
                <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>No Converters</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>Create an uplink decoder or downlink encoder.</div>
                <button 
                  onClick={() => {
                    const newId = `conv-${Date.now()}`;
                    const newConv = {
                      id: newId,
                      name: 'Custom Payload Decoder',
                      type: 'UPLINK',
                      script: '// Decode incoming payload bytes/JSON\nvar data = decodeToJson(payload);\nreturn {\n  deviceName: data.devId || "Edge_Sensor",\n  deviceType: "sensor",\n  telemetry: [\n    { ts: Date.now(), values: data.values || {}\n  }\n  ]\n};',
                      sample_payload: '{"devId":"pump-01","values":{"temperature":78.5,"pressure":142.3}}'
                    };
                    setConverters([newConv]);
                    selectConverter(newConv);
                  }}
                  className="dm-btn dm-btn-primary" 
                  style={{ marginTop: '12px', width: '100%', fontSize: '0.72rem', justifyContent: 'center' }}
                >
                  <Plus size={12} /> <span>Create Converter</span>
                </button>
              </div>
            ) : (
              converters.map(conv => {
                const isSelected = conv.id === selectedConverterId;
                const isUplink = conv.type === 'UPLINK';
                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConverter(conv)}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid',
                      borderColor: isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                        {conv.name}
                      </span>
                      <span style={{
                        fontSize: '0.6rem',
                        padding: '1px 6px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        background: isUplink ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: isUplink ? '#10b981' : '#f59e0b'
                      }}>
                        {conv.type}
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px' }}>
                      ID: {conv.id}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: Code Editor */}
        <div style={{
          background: '#070a11',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, marginRight: '16px' }}>
              <Code2 size={16} color="#38bdf8" />
              <input
                type="text"
                value={converterName}
                onChange={(e) => setConverterName(e.target.value)}
                className="dm-input"
                style={{ fontSize: '0.85rem', fontWeight: 700, padding: '4px 8px', flex: 1 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setConverterType('UPLINK')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: converterType === 'UPLINK' ? '#10b981' : 'rgba(255,255,255,0.08)',
                  background: converterType === 'UPLINK' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: converterType === 'UPLINK' ? '#10b981' : '#94a3b8'
                }}
              >
                UPLINK (DECODER)
              </button>
              <button
                onClick={() => setConverterType('DOWNLINK')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: converterType === 'DOWNLINK' ? '#f59e0b' : 'rgba(255,255,255,0.08)',
                  background: converterType === 'DOWNLINK' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  color: converterType === 'DOWNLINK' ? '#f59e0b' : '#94a3b8'
                }}
              >
                DOWNLINK (ENCODER)
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {converterType === 'UPLINK' 
              ? 'Return format must be: { deviceName, deviceType, telemetry: [{ ts, values: {...} }], attributes: {...} }'
              : 'Return format must be: target protocol request frame (e.g. OPC UA Node Write payload or Modbus PDU)'}
          </div>

          <textarea
            value={scriptCode}
            onChange={(e) => setScriptCode(e.target.value)}
            className="dm-input mono"
            style={{
              flex: 1,
              resize: 'none',
              background: '#040711',
              color: '#38bdf8',
              fontSize: '0.78rem',
              lineHeight: '1.45',
              padding: '12px',
              borderRadius: '6px'
            }}
            placeholder="// Write converter script function decode(payload, metadata) {...}"
          />
        </div>

        {/* Column 3: Live Simulator & Output */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Test Input Payload */}
          <div style={{
            background: '#070a11',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc' }}>Test Inbound Payload</span>
              <button
                className="dm-btn dm-btn-primary"
                style={{ padding: '3px 10px', fontSize: '0.7rem' }}
                onClick={handleTestRun}
                disabled={testing}
              >
                <Play size={11} className={testing ? "animate-spin" : ""} />
                <span>{testing ? 'Decoding...' : 'Test Decoder'}</span>
              </button>
            </div>

            <textarea
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="dm-input mono"
              style={{
                flex: 1,
                resize: 'none',
                background: '#040711',
                color: '#e2e8f0',
                fontSize: '0.72rem',
                lineHeight: '1.4',
                padding: '10px',
                borderRadius: '6px'
              }}
              placeholder="Paste raw inbound JSON, CSV, or hex string..."
            />
          </div>

          {/* Test Output Panel */}
          <div style={{
            background: '#070a11',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            padding: '12px',
            flex: 1.2,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981' }}>Normalized Output</span>
              {testResult?.execution_time_ms && (
                <span className="mono" style={{ fontSize: '0.68rem', color: '#38bdf8' }}>
                  {testResult.execution_time_ms} ms
                </span>
              )}
            </div>

            <div style={{
              flex: 1,
              background: '#040711',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '10px',
              overflowY: 'auto'
            }}>
              {testResult ? (
                <pre className="mono" style={{ fontSize: '0.7rem', color: testResult.status === 'SUCCESS' ? '#10b981' : '#ef4444', margin: 0 }}>
                  {JSON.stringify(testResult.output || testResult, null, 2)}
                </pre>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.72rem', textAlign: 'center', marginTop: '40px' }}>
                  Click "Test Decoder" to run the converter against test payload.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

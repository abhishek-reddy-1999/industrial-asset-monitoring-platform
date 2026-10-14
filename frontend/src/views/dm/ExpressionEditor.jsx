import React, { useState, useRef, useEffect } from 'react';
import { Calculator, Check, Sparkles, HelpCircle, Variable } from 'lucide-react';

/**
 * ExpressionEditor with '@' attribute trigger, autocomplete popup,
 * quick-insert attribute chips, math functions toolbar, and live preview calculation.
 */
export default function ExpressionEditor({
  value = '',
  onChange,
  availableAttributes = [],
  placeholder = 'e.g. (@Discharge_Pressure - @Suction_Pressure) * 1000 / (9.81 * 850)',
  label = 'Expression Formula (Type @ to select created attributes)',
  rows = 3
}) {
  const textareaRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveResult, setLiveResult] = useState(null);
  const [liveError, setLiveError] = useState(null);

  // Normalize attributes for lookup
  const attrList = availableAttributes.map(a => {
    const rawName = typeof a === 'string' ? a : (a.name || a.key || '');
    const safeName = rawName.trim().replace(/\s+/g, '_');
    const val = typeof a === 'object' ? (a.value ?? 0) : 0;
    const uom = typeof a === 'object' ? (a.uom || '') : '';
    const type = typeof a === 'object' ? (a.type || '') : '';
    return {
      rawName,
      safeName,
      token: `@${safeName}`,
      value: val,
      numValue: parseFloat(val) || 0,
      uom,
      type
    };
  }).filter(a => a.rawName);

  // Filtered suggestions based on what user typed after '@'
  const filteredSuggestions = attrList.filter(a => {
    if (!suggestionQuery) return true;
    const q = suggestionQuery.toLowerCase();
    return a.safeName.toLowerCase().includes(q) || a.rawName.toLowerCase().includes(q);
  });

  // Check cursor position for '@' trigger
  const checkAtTrigger = () => {
    if (!textareaRef.current) return;
    const text = textareaRef.current.value;
    const cursor = textareaRef.current.selectionStart;
    const beforeCursor = text.substring(0, cursor);
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setSuggestionQuery(match[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleTextChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    setTimeout(checkAtTrigger, 10);
  };

  // Insert token at current cursor position
  const insertToken = (tokenToInsert) => {
    if (!textareaRef.current) {
      onChange((value || '') + tokenToInsert);
      return;
    }
    const text = value || '';
    const cursor = textareaRef.current.selectionStart;
    const beforeCursor = text.substring(0, cursor);
    const afterCursor = text.substring(textareaRef.current.selectionEnd);

    // If cursor was in an @query, replace that query
    const match = beforeCursor.match(/@([a-zA-Z0-9_]*)$/);
    let newText = '';
    let newCursorPos = 0;

    if (match) {
      const prefix = beforeCursor.substring(0, match.index);
      newText = prefix + tokenToInsert + afterCursor;
      newCursorPos = prefix.length + tokenToInsert.length;
    } else {
      newText = beforeCursor + tokenToInsert + afterCursor;
      newCursorPos = beforeCursor.length + tokenToInsert.length;
    }

    onChange(newText);
    setShowSuggestions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 20);
  };

  // Keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredSuggestions[selectedIndex]) {
        e.preventDefault();
        insertToken(filteredSuggestions[selectedIndex].token);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Evaluate formula live with attribute values
  useEffect(() => {
    if (!value || !value.trim()) {
      setLiveResult(null);
      setLiveError(null);
      return;
    }

    try {
      let expr = value.trim();
      if (expr.startsWith('return ')) expr = expr.substring(7);
      if (expr.endsWith(';')) expr = expr.slice(0, -1);

      // Substitute attribute tokens with numeric values
      for (const attr of attrList) {
        // Substitute @Safe_Name and @Raw Name
        const regexSafe = new RegExp(`@${attr.safeName}\\b`, 'gi');
        expr = expr.replace(regexSafe, String(attr.numValue));
        const regexRaw = new RegExp(`@${attr.rawName.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        expr = expr.replace(regexRaw, String(attr.numValue));
      }

      // Check if there are unmapped @variables
      if (/@\w+/.test(expr)) {
        const unmapped = expr.match(/@\w+/g);
        setLiveResult(null);
        setLiveError(`Unmapped variable(s): ${unmapped.join(', ')}`);
        return;
      }

      // Substitute Microsoft Math functions
      expr = expr.replace(/Math\.Round\(([^,]+),\s*(\d+)\)/gi, (m, p1, p2) => {
        return `(Math.round((${p1}) * Math.pow(10, ${p2})) / Math.pow(10, ${p2}))`;
      });
      expr = expr.replace(/Math\.Round\(([^)]+)\)/gi, 'Math.round($1)');
      expr = expr.replace(/Math\.Abs\(([^)]+)\)/gi, 'Math.abs($1)');
      expr = expr.replace(/Math\.Sqrt\(([^)]+)\)/gi, 'Math.sqrt($1)');
      expr = expr.replace(/Math\.Pow\(([^,]+),\s*([^)]+)\)/gi, 'Math.pow($1, $2)');
      expr = expr.replace(/Math\.Min\(([^,]+),\s*([^)]+)\)/gi, 'Math.min($1, $2)');
      expr = expr.replace(/Math\.Max\(([^,]+),\s*([^)]+)\)/gi, 'Math.max($1, $2)');

      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expr})`);
      const res = fn();
      if (typeof res === 'number' && !isNaN(res)) {
        setLiveResult(Math.round(res * 1000) / 1000);
        setLiveError(null);
      } else {
        setLiveResult(null);
        setLiveError(String(res));
      }
    } catch (err) {
      setLiveResult(null);
      setLiveError(err.message);
    }
  }, [value, availableAttributes]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <label className="dm-field-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calculator size={13} color="#38bdf8" />
            <span>{label}</span>
          </label>
          <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
            Type <code style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.15)', padding: '1px 5px', borderRadius: '3px' }}>@</code> to insert attribute
          </span>
        </div>
      )}

      {/* Quick Insert Attribute Chips */}
      {attrList.length > 0 && (
        <div style={{ marginBottom: '6px', background: '#070b14', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Variable size={11} color="#a855f7" />
            <span>Click attribute to insert:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '68px', overflowY: 'auto' }}>
            {attrList.map(attr => (
              <button
                key={attr.safeName}
                type="button"
                onClick={() => insertToken(` ${attr.token} `)}
                style={{
                  fontSize: '0.68rem',
                  fontFamily: 'monospace',
                  padding: '2px 7px',
                  borderRadius: '3px',
                  background: 'rgba(168, 85, 247, 0.12)',
                  color: '#c084fc',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title={`Value: ${attr.value} ${attr.uom} (${attr.type})`}
              >
                <span>{attr.token}</span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>({attr.value})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Operators & Math Functions Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
        {[
          { label: '+', insert: ' + ' },
          { label: '−', insert: ' - ' },
          { label: '×', insert: ' * ' },
          { label: '÷', insert: ' / ' },
          { label: '( )', insert: '()' },
          { label: 'Math.Round(x, 2)', insert: 'Math.Round(, 2)' },
          { label: 'Math.Sqrt(x)', insert: 'Math.Sqrt()' },
          { label: 'Math.Abs(x)', insert: 'Math.Abs()' },
          { label: 'Math.Pow(x, 2)', insert: 'Math.Pow(, 2)' }
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => insertToken(item.insert)}
            style={{
              fontSize: '0.66rem',
              padding: '2px 6px',
              borderRadius: '3px',
              background: '#0d1527',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer'
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Textarea Input */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          rows={rows}
          className="dm-textarea mono"
          placeholder={placeholder}
          value={value}
          onChange={handleTextChange}
          onClick={checkAtTrigger}
          onKeyUp={checkAtTrigger}
          onKeyDown={handleKeyDown}
          style={{ width: '100%', fontSize: '0.78rem', lineHeight: '1.4' }}
        />

        {/* Suggestion Dropdown Popup */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1500,
              background: '#0a0f1d',
              border: '1px solid #38bdf8',
              borderRadius: '6px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 0 12px rgba(56, 189, 248, 0.3)',
              maxHeight: '180px',
              overflowY: 'auto',
              marginTop: '4px'
            }}
          >
            <div style={{ padding: '4px 8px', fontSize: '0.66rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 600 }}>
              Insert Created Attribute (Press Enter or Click):
            </div>
            {filteredSuggestions.map((attr, idx) => (
              <div
                key={attr.safeName}
                onClick={() => insertToken(attr.token)}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  background: idx === selectedIndex ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}
              >
                <div>
                  <span className="mono" style={{ color: '#38bdf8', fontWeight: 600 }}>{attr.token}</span>
                  {attr.rawName !== attr.safeName && (
                    <span style={{ fontSize: '0.66rem', color: '#94a3b8', marginLeft: '6px' }}>({attr.rawName})</span>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#10b981', fontFamily: 'monospace' }}>
                  val: {attr.value} {attr.uom}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Calculation Preview Status Box */}
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: liveResult !== null ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)', border: liveResult !== null ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={12} color={liveResult !== null ? '#10b981' : '#94a3b8'} />
          {liveResult !== null ? (
            <span>
              <strong style={{ color: '#10b981' }}>Live Evaluated Result: </strong>
              <code className="mono font-bold" style={{ color: '#f8fafc', fontSize: '0.78rem' }}>{liveResult}</code>
            </span>
          ) : liveError ? (
            <span style={{ color: '#f59e0b' }}>{liveError}</span>
          ) : (
            <span style={{ color: '#64748b' }}>Enter formula or insert attributes using @ to test calculation</span>
          )}
        </div>
        {liveResult !== null && (
          <span style={{ color: '#10b981', fontSize: '0.65rem', fontWeight: 600 }}>VALID FORMULA ✓</span>
        )}
      </div>
    </div>
  );
}

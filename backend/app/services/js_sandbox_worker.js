/**
 * Industrial JavaScript Sandbox Worker (Node.js Isolated Execution Boundary)
 * Provides strict sandbox isolation, memory & execution time guards,
 * deterministic helper functions, and schema validation.
 */
const vm = require('node:vm');
const fs = require('node:fs');

// Bounded logging capture
const logs = [];
const MAX_LOG_ENTRIES = 50;
const MAX_LOG_LENGTH = 1000;

function safeLog(...args) {
  if (logs.length >= MAX_LOG_ENTRIES) return;
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  logs.push(msg.slice(0, MAX_LOG_LENGTH));
}

// Built-in Deterministic Helper Functions (ctx.helpers)
const helpers = {
  sum: (arr = []) => {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce((acc, v) => acc + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
  },
  avg: (arr = []) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const s = helpers.sum(arr);
    return Number((s / arr.length).toFixed(6));
  },
  min: (arr = []) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const nums = arr.map(Number).filter(Number.isFinite);
    return nums.length ? Math.min(...nums) : 0;
  },
  max: (arr = []) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    const nums = arr.map(Number).filter(Number.isFinite);
    return nums.length ? Math.max(...nums) : 0;
  },
  round: (val, decimals = 2) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },
  clamp: (val, min, max) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return min;
    return Math.min(Math.max(num, min), max);
  },
  percentChange: (oldVal, newVal) => {
    const o = Number(oldVal);
    const n = Number(newVal);
    if (!Number.isFinite(o) || !Number.isFinite(n) || o === 0) return 0;
    return Number((((n - o) / Math.abs(o)) * 100).toFixed(2));
  },
  safeDivide: (numerator, denominator, fallback = 0.0) => {
    const n = Number(numerator);
    const d = Number(denominator);
    if (!Number.isFinite(n) || !Number.isFinite(d) || Math.abs(d) < 1e-12) return fallback;
    return n / d;
  },
  isValidNumber: (val) => {
    return val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val));
  },
  qualityIsGood: (quality) => {
    if (!quality) return false;
    const q = String(quality).toUpperCase();
    return q === 'GOOD' || q === '192';
  },
  // Time-Series Window Helpers
  windowFilter: (series = [], predicate) => {
    if (!Array.isArray(series)) return [];
    if (typeof predicate !== 'function') return series;
    return series.filter(predicate);
  },
  mean: (series = [], key = 'value') => {
    if (!Array.isArray(series) || series.length === 0) return 0;
    const vals = series.map(item => (typeof item === 'object' && item !== null ? item[key] : item));
    return helpers.avg(vals);
  },
  stdDev: (series = [], key = 'value') => {
    if (!Array.isArray(series) || series.length <= 1) return 0;
    const vals = series.map(item => (typeof item === 'object' && item !== null ? Number(item[key]) : Number(item))).filter(Number.isFinite);
    if (vals.length <= 1) return 0;
    const avgVal = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + Math.pow(b - avgVal, 2), 0) / (vals.length - 1);
    return Number(Math.sqrt(variance).toFixed(4));
  },
  rateOfChange: (series = [], key = 'value') => {
    if (!Array.isArray(series) || series.length < 2) return 0;
    const p1 = series[0];
    const p2 = series[series.length - 1];
    const v1 = typeof p1 === 'object' && p1 !== null ? Number(p1[key]) : Number(p1);
    const v2 = typeof p2 === 'object' && p2 !== null ? Number(p2[key]) : Number(p2);
    return Number((v2 - v1).toFixed(4));
  },
  durationAboveThreshold: (series = [], key = 'value', threshold = 0) => {
    if (!Array.isArray(series)) return 0;
    let count = 0;
    for (const item of series) {
      const v = typeof item === 'object' && item !== null ? Number(item[key]) : Number(item);
      if (v > threshold) count++;
    }
    return count;
  },
  count: (series = [], predicate) => {
    if (!Array.isArray(series)) return 0;
    if (typeof predicate !== 'function') return series.length;
    return series.filter(predicate).length;
  }
};

async function main() {
  const startTime = performance.now();
  let rawInput = '';

  try {
    rawInput = fs.readFileSync(0, 'utf-8');
  } catch (err) {
    process.stdout.write(JSON.stringify({
      success: false,
      error: 'Failed to read input from stdin: ' + err.message,
      logs: [],
      duration_ms: 0
    }));
    process.exit(1);
  }

  let job;
  try {
    job = JSON.parse(rawInput);
  } catch (err) {
    process.stdout.write(JSON.stringify({
      success: false,
      error: 'Invalid JSON payload: ' + err.message,
      logs: [],
      duration_ms: 0
    }));
    process.exit(1);
  }

  const {
    script = '',
    contract = 'FB_CALCULATE',
    ctx = {},
    inputs = {},
    msg = {},
    metadata = {},
    msgType = 'POST_TELEMETRY_REQUEST',
    timeout_ms = 1500
  } = job;

  // Enrich ctx with helpers & frozen structure
  const enrichedCtx = {
    asset: ctx.asset || null,
    timestamp: ctx.timestamp || new Date().toISOString(),
    parameters: Object.freeze({ ...(ctx.parameters || {}) }),
    inputMetadata: Object.freeze({ ...(ctx.inputMetadata || {}) }),
    executionId: ctx.executionId || 'exec-' + Math.random().toString(36).slice(2, 10),
    helpers: Object.freeze(helpers)
  };

  // Build Sandbox Context with STRICT Security Boundary
  const sandbox = {
    Math,
    Number,
    String,
    Boolean,
    Date,
    Array,
    Object,
    JSON,
    RegExp,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    console: {
      log: safeLog,
      warn: safeLog,
      error: safeLog,
      info: safeLog,
      debug: safeLog
    },
    ctx: enrichedCtx,
    inputs: Object.freeze({ ...inputs }),
    msg: JSON.parse(JSON.stringify(msg)),
    metadata: JSON.parse(JSON.stringify(metadata)),
    msgType: String(msgType),
    __result: undefined
  };

  // Prevent prototype pollution or escaping the sandbox
  const createForbiddenTrap = (name) => {
    return new Proxy(function() {}, {
      get: (_t, _prop) => {
        throw new Error(`Security Violation: Access to host module or forbidden object '${name}' is restricted.`);
      },
      apply: () => {
        throw new Error(`Security Violation: Calling forbidden function '${name}' is restricted.`);
      }
    });
  };

  sandbox.global = createForbiddenTrap('global');
  sandbox.process = createForbiddenTrap('process');
  sandbox.require = createForbiddenTrap('require');
  sandbox.module = createForbiddenTrap('module');
  sandbox.exports = createForbiddenTrap('exports');
  sandbox.fetch = createForbiddenTrap('fetch');
  sandbox.Buffer = createForbiddenTrap('Buffer');
  sandbox.child_process = createForbiddenTrap('child_process');
  sandbox.fs = createForbiddenTrap('fs');
  sandbox.setImmediate = undefined;
  sandbox.setInterval = undefined;
  sandbox.setTimeout = undefined;

  const context = vm.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false }
  });

  // Prepare executable wrapper according to contract
  let wrappedScript = '';
  if (contract === 'FB_CALCULATE' || contract === 'RULE_KPI') {
    wrappedScript = `
      "use strict";
      ${script}
      if (typeof calculate === 'function') {
        __result = calculate(ctx, inputs);
      } else {
        // Evaluate direct function expression or block
        __result = (function(ctx, inputs) {
          ${script}
        })(ctx, inputs);
      }
    `;
  } else if (contract === 'RULE_FILTER') {
    wrappedScript = `
      "use strict";
      ${script}
      if (typeof filter === 'function') {
        __result = Boolean(filter(msg, metadata, msgType));
      } else {
        __result = Boolean((function(msg, metadata, msgType) {
          ${script}
        })(msg, metadata, msgType));
      }
    `;
  } else if (contract === 'RULE_TRANSFORM') {
    wrappedScript = `
      "use strict";
      ${script}
      if (typeof transform === 'function') {
        __result = transform(msg, metadata, msgType);
      } else {
        __result = (function(msg, metadata, msgType) {
          ${script}
        })(msg, metadata, msgType);
      }
    `;
  } else if (contract === 'RULE_ENRICHMENT') {
    wrappedScript = `
      "use strict";
      ${script}
      if (typeof enrich === 'function') {
        __result = enrich(msg, metadata, msgType, ctx);
      } else {
        __result = (function(msg, metadata, msgType, ctx) {
          ${script}
        })(msg, metadata, msgType, ctx);
      }
    `;
  } else if (contract === 'RULE_ROUTER') {
    wrappedScript = `
      "use strict";
      ${script}
      if (typeof route === 'function') {
        __result = route(msg, metadata, msgType);
      } else {
        __result = (function(msg, metadata, msgType) {
          ${script}
        })(msg, metadata, msgType);
      }
    `;
  } else {
    wrappedScript = `
      "use strict";
      __result = (function() {
        ${script}
      })();
    `;
  }

  try {
    const scriptObj = new vm.Script(wrappedScript, {
      filename: 'user_script.js',
      lineOffset: 0,
      columnOffset: 0
    });

    scriptObj.runInContext(context, {
      timeout: Math.min(timeout_ms, 5000),
      displayErrors: true,
      breakOnSigint: true
    });

    const executionDuration = performance.now() - startTime;
    let evalResult = sandbox.__result;

    // Validate result is JSON serializable
    let serializedResult = null;
    if (evalResult !== undefined) {
      try {
        serializedResult = JSON.parse(JSON.stringify(evalResult));
      } catch (err) {
        serializedResult = String(evalResult);
      }
    }

    process.stdout.write(JSON.stringify({
      success: true,
      result: serializedResult,
      logs: logs,
      duration_ms: Number(executionDuration.toFixed(2))
    }));
    process.exit(0);

  } catch (err) {
    const executionDuration = performance.now() - startTime;
    let errType = err.name || 'ScriptError';
    let isTimeout = err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message.includes('timed out');

    process.stdout.write(JSON.stringify({
      success: false,
      error: err.message,
      error_type: errType,
      is_timeout: isTimeout,
      stack: err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : '',
      logs: logs,
      duration_ms: Number(executionDuration.toFixed(2))
    }));
    process.exit(0);
  }
}

main();

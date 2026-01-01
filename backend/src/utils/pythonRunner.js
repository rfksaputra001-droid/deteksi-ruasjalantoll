/**
 * Python Runner Utility
 * Robust Python process spawning for Node.js backend
 * 
 * Features:
 * - Dynamic Python path detection
 * - Environment variable support
 * - Timeout protection
 * - Comprehensive error handling
 * - Detailed logging
 * 
 * @module utils/pythonRunner
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// ═══════════════════════════════════════════════════════════════
// CACHED PYTHON PATH - Avoid repeated detection
// ═══════════════════════════════════════════════════════════════
let cachedPythonPath = null;

/**
 * Check if a command exists and is executable
 * @param {string} command - Command to check
 * @returns {boolean}
 */
function commandExists(command) {
  try {
    // For absolute paths, check file exists
    if (command.startsWith('/')) {
      return fs.existsSync(command);
    }
    // For relative commands, try which
    execSync(`which ${command}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the Python executable path with ROBUST detection
 * Priority:
 * 1. Cached path (if already found and verified)
 * 2. PYTHON_EXECUTABLE env var
 * 3. /opt/venv/bin/python (Docker - PRIMARY for Render)
 * 4. /opt/venv/bin/python3 (Docker alternative)
 * 5. System Python paths
 * 6. PATH-based fallback
 */
function getPythonExecutable() {
  // Return cached path if already verified
  if (cachedPythonPath && commandExists(cachedPythonPath)) {
    return cachedPythonPath;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Priority 1: Environment variable (allows override)
  // ═══════════════════════════════════════════════════════════════
  if (process.env.PYTHON_EXECUTABLE && commandExists(process.env.PYTHON_EXECUTABLE)) {
    cachedPythonPath = process.env.PYTHON_EXECUTABLE;
    logger.info(`✅ Using PYTHON_EXECUTABLE env: ${cachedPythonPath}`);
    return cachedPythonPath;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Priority 2: Docker venv paths (CRITICAL for Render.com)
  // These are the paths created by our Dockerfile
  // ═══════════════════════════════════════════════════════════════
  const dockerPaths = [
    '/opt/venv/bin/python',      // Primary Docker venv
    '/opt/venv/bin/python3',     // Alternative Docker venv
    '/opt/venv/bin/python3.11',  // Specific version
  ];
  
  for (const pyPath of dockerPaths) {
    if (fs.existsSync(pyPath)) {
      cachedPythonPath = pyPath;
      logger.info(`✅ Using Docker venv Python: ${cachedPythonPath}`);
      return cachedPythonPath;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Priority 3: System Python paths (for local development)
  // ═══════════════════════════════════════════════════════════════
  const systemPaths = [
    '/usr/bin/python3.11',
    '/usr/bin/python3.10',
    '/usr/bin/python3',
    '/usr/local/bin/python3.11',
    '/usr/local/bin/python3',
    '/usr/bin/python',
  ];
  
  for (const pyPath of systemPaths) {
    if (fs.existsSync(pyPath)) {
      cachedPythonPath = pyPath;
      logger.info(`✅ Using system Python: ${cachedPythonPath}`);
      return cachedPythonPath;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // Priority 4: PATH-based fallback (last resort)
  // ═══════════════════════════════════════════════════════════════
  const pathCommands = ['python3', 'python'];
  for (const cmd of pathCommands) {
    if (commandExists(cmd)) {
      cachedPythonPath = cmd;
      logger.info(`✅ Using PATH Python: ${cachedPythonPath}`);
      return cachedPythonPath;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // FALLBACK: Return python3 and hope for the best
  // ═══════════════════════════════════════════════════════════════
  logger.error('❌ No Python executable found! Using "python3" as fallback');
  logger.error('   Checked paths:', [...dockerPaths, ...systemPaths]);
  return 'python3';
}

/**
 * Clear cached Python path (useful for testing or if Python changes)
 */
function clearPythonCache() {
  cachedPythonPath = null;
  logger.debug('Python path cache cleared');
}

/**
 * Get Python environment variables for spawning
 */
function getPythonEnv() {
  return {
    ...process.env,
    PYTHONPATH: '/app:/opt/venv/lib/python3.11/site-packages',
    PYTHONDONTWRITEBYTECODE: '1',
    PYTHONUNBUFFERED: '1',
    OPENCV_LOG_LEVEL: 'ERROR',
    MPLCONFIGDIR: '/tmp/matplotlib',
    QT_QPA_PLATFORM: 'offscreen',
    VIRTUAL_ENV: '/opt/venv',
    PATH: '/opt/venv/bin:/usr/local/bin:/usr/bin:/bin',
    TORCH_HOME: '/app/.torch',
    HF_HOME: '/app/.huggingface',
    YOLO_VERBOSE: 'False',
    OMP_NUM_THREADS: '1',
    NUMBA_DISABLE_JIT: '1'
  };
}

/**
 * Run Python code and return promise
 * 
 * @param {string} code - Python code to execute
 * @param {Object} options - Spawn options
 * @param {number} options.timeout - Timeout in ms (default: 3600000 = 1 hour)
 * @param {string} options.cwd - Working directory (default: /app)
 * @param {function} options.onStdout - Callback for stdout data
 * @param {function} options.onStderr - Callback for stderr data
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runPythonCode(code, options = {}) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = getPythonExecutable();
    const pythonEnv = getPythonEnv();
    
    const {
      timeout = 3600000, // 1 hour default
      cwd = '/app',
      onStdout = null,
      onStderr = null
    } = options;
    
    logger.info(`🐍 Running Python with: ${pythonExecutable}`);
    logger.debug(`📁 Working directory: ${cwd}`);
    
    const python = spawn(pythonExecutable, ['-c', code], {
      timeout,
      cwd,
      env: pythonEnv
    });
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (onStdout) onStdout(chunk);
    });
    
    python.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (onStderr) onStderr(chunk);
      // Log stderr but don't treat all as errors (some are warnings)
      if (chunk.includes('Error') || chunk.includes('error')) {
        logger.warn(`Python stderr: ${chunk.trim()}`);
      }
    });
    
    python.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, code: exitCode });
      } else {
        const error = new Error(`Python process exited with code ${exitCode}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.exitCode = exitCode;
        reject(error);
      }
    });
    
    python.on('error', (err) => {
      // This happens when spawn itself fails (ENOENT)
      const error = new Error(`Python spawn error: ${err.message}`);
      error.originalError = err;
      error.pythonPath = pythonExecutable;
      logger.error(`❌ Python spawn failed: ${err.message}`);
      logger.error(`   Python path: ${pythonExecutable}`);
      logger.error(`   Path exists: ${fs.existsSync(pythonExecutable)}`);
      reject(error);
    });
  });
}

/**
 * Run Python script file
 * 
 * @param {string} scriptPath - Path to Python script
 * @param {Array<string>} args - Script arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
function runPythonScript(scriptPath, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const pythonExecutable = getPythonExecutable();
    const pythonEnv = getPythonEnv();
    
    const {
      timeout = 3600000,
      cwd = '/app',
      onStdout = null,
      onStderr = null
    } = options;
    
    logger.info(`🐍 Running Python script: ${scriptPath}`);
    
    const python = spawn(pythonExecutable, [scriptPath, ...args], {
      timeout,
      cwd,
      env: pythonEnv
    });
    
    let stdout = '';
    let stderr = '';
    
    python.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (onStdout) onStdout(chunk);
    });
    
    python.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (onStderr) onStderr(chunk);
    });
    
    python.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, code: exitCode });
      } else {
        const error = new Error(`Python script exited with code ${exitCode}`);
        error.stdout = stdout;
        error.stderr = stderr;
        error.exitCode = exitCode;
        reject(error);
      }
    });
    
    python.on('error', (err) => {
      const error = new Error(`Python spawn error: ${err.message}`);
      error.originalError = err;
      reject(error);
    });
  });
}

/**
 * Verify Python installation and dependencies
 * @returns {Promise<Object>} Verification results
 */
async function verifyPython() {
  const pythonExecutable = getPythonExecutable();
  const exists = pythonExecutable.startsWith('/') 
    ? fs.existsSync(pythonExecutable) 
    : true; // Assume PATH-based exists
  
  const result = {
    executable: pythonExecutable,
    exists,
    version: null,
    packages: {},
    error: null
  };
  
  if (!exists) {
    result.error = `Python not found at ${pythonExecutable}`;
    return result;
  }
  
  try {
    const testCode = `
import sys
import json

result = {
    'version': sys.version,
    'executable': sys.executable,
    'packages': {}
}

# Test imports
packages = ['cv2', 'numpy', 'torch', 'ultralytics']
for pkg in packages:
    try:
        mod = __import__(pkg)
        result['packages'][pkg] = {
            'installed': True,
            'version': getattr(mod, '__version__', 'unknown')
        }
    except ImportError as e:
        result['packages'][pkg] = {
            'installed': False,
            'error': str(e)
        }

print(json.dumps(result))
`;
    
    const { stdout } = await runPythonCode(testCode, { timeout: 30000 });
    const parsed = JSON.parse(stdout.trim());
    result.version = parsed.version;
    result.packages = parsed.packages;
    
  } catch (err) {
    result.error = err.message;
    if (err.stderr) result.stderr = err.stderr;
  }
  
  return result;
}

/**
 * Check if all required packages are installed
 * @returns {Promise<boolean>}
 */
async function checkDependencies() {
  const verification = await verifyPython();
  
  if (verification.error) {
    logger.error(`Python verification failed: ${verification.error}`);
    return false;
  }
  
  const requiredPackages = ['cv2', 'numpy', 'torch', 'ultralytics'];
  const missing = requiredPackages.filter(
    pkg => !verification.packages[pkg]?.installed
  );
  
  if (missing.length > 0) {
    logger.error(`Missing Python packages: ${missing.join(', ')}`);
    return false;
  }
  
  logger.info('✅ All Python dependencies verified');
  return true;
}

/**
 * Get comprehensive Python diagnostic info
 * Useful for debugging Python environment issues
 * @returns {Object} Diagnostic information
 */
function getDiagnostics() {
  const pythonExecutable = getPythonExecutable();
  
  // Check all possible paths
  const pathChecks = {
    '/opt/venv/bin/python': fs.existsSync('/opt/venv/bin/python'),
    '/opt/venv/bin/python3': fs.existsSync('/opt/venv/bin/python3'),
    '/usr/bin/python3.11': fs.existsSync('/usr/bin/python3.11'),
    '/usr/bin/python3': fs.existsSync('/usr/bin/python3'),
    '/usr/bin/python': fs.existsSync('/usr/bin/python'),
  };
  
  return {
    detected: pythonExecutable,
    cached: cachedPythonPath,
    pathChecks,
    env: {
      PYTHON_EXECUTABLE: process.env.PYTHON_EXECUTABLE,
      PYTHONPATH: process.env.PYTHONPATH,
      VIRTUAL_ENV: process.env.VIRTUAL_ENV,
      PATH: process.env.PATH,
    },
    directories: {
      '/opt/venv': fs.existsSync('/opt/venv'),
      '/opt/venv/bin': fs.existsSync('/opt/venv/bin'),
      '/app': fs.existsSync('/app'),
    }
  };
}

module.exports = {
  getPythonExecutable,
  getPythonEnv,
  runPythonCode,
  runPythonScript,
  verifyPython,
  checkDependencies,
  clearPythonCache,
  getDiagnostics
};

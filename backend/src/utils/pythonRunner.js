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

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Get the Python executable path
 * Priority:
 * 1. PYTHON_EXECUTABLE env var
 * 2. /opt/venv/bin/python (Docker)
 * 3. System fallbacks
 */
function getPythonExecutable() {
  // Priority 1: Environment variable
  if (process.env.PYTHON_EXECUTABLE) {
    logger.debug(`Using PYTHON_EXECUTABLE env: ${process.env.PYTHON_EXECUTABLE}`);
    return process.env.PYTHON_EXECUTABLE;
  }
  
  // Priority 2: Docker venv (MOST RELIABLE for Render)
  const dockerVenvPath = '/opt/venv/bin/python';
  if (fs.existsSync(dockerVenvPath)) {
    logger.debug(`Using Docker venv: ${dockerVenvPath}`);
    return dockerVenvPath;
  }
  
  // Priority 3: System Python paths (for local development)
  const systemPaths = [
    '/usr/bin/python3.11',
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    '/usr/bin/python'
  ];
  
  for (const pyPath of systemPaths) {
    if (fs.existsSync(pyPath)) {
      logger.debug(`Using system Python: ${pyPath}`);
      return pyPath;
    }
  }
  
  // Fallback: hope it's in PATH
  logger.warn('No Python found in known paths, using "python3" from PATH');
  return 'python3';
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

module.exports = {
  getPythonExecutable,
  getPythonEnv,
  runPythonCode,
  runPythonScript,
  verifyPython,
  checkDependencies
};

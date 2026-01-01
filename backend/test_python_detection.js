#!/usr/bin/env node
/**
 * Quick test script untuk debug Python detection
 * Run: node test_python_detection.js
 */

const { getPythonExecutable, getPythonEnv, getDiagnostics } = require('./src/utils/pythonRunner');
const logger = require('./src/utils/logger');

async function testPythonDetection() {
  console.log('🔍 Testing Python Detection...\n');
  
  try {
    // Test Python executable detection
    console.log('1. Python Executable Detection:');
    const pythonPath = getPythonExecutable();
    console.log(`   Result: ${pythonPath}\n`);
    
    // Test Python environment
    console.log('2. Python Environment:');
    const pythonEnv = getPythonEnv();
    console.log('   PYTHONPATH:', pythonEnv.PYTHONPATH);
    console.log('   VIRTUAL_ENV:', pythonEnv.VIRTUAL_ENV);
    console.log('   PATH (first 5):', pythonEnv.PATH.split(':').slice(0, 5).join(':'));
    console.log();
    
    // Test diagnostics
    console.log('3. Full Diagnostics:');
    const diagnostics = getDiagnostics();
    console.log('   Path checks:');
    Object.entries(diagnostics.pathChecks).forEach(([path, exists]) => {
      console.log(`     ${exists ? '✅' : '❌'} ${path}`);
    });
    
    console.log('\n   Environment:');
    console.log(`     PYTHON_EXECUTABLE: ${diagnostics.env.PYTHON_EXECUTABLE}`);
    console.log(`     VIRTUAL_ENV: ${diagnostics.env.VIRTUAL_ENV}`);
    console.log(`     PYTHONPATH: ${diagnostics.env.PYTHONPATH}`);
    
    console.log('\n   Directories:');
    Object.entries(diagnostics.directories).forEach(([path, exists]) => {
      console.log(`     ${exists ? '✅' : '❌'} ${path}`);
    });
    
    console.log('\n   Detection result:');
    console.log(`     Detected: ${diagnostics.detected}`);
    console.log(`     Cached: ${diagnostics.cached}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testPythonDetection();
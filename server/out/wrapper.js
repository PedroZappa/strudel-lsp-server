#!/usr/bin/env node
/**
 * Strudel LSP Wrapper
 * Converts stdio to TCP for Neovim LSP client
 * 
 * Usage: node wrapper.js
 * (This script connects to TCP server and bridges stdio)
 */

const net = require('net');
const TCP_HOST = '127.0.0.1';
const TCP_PORT = 5007;

let socket = null;

function connectToServer() {
  return new Promise((resolve, reject) => {
    socket = net.createConnection(TCP_PORT, TCP_HOST, () => {
      console.error(`[Wrapper] Connected to TCP server at ${TCP_HOST}:${TCP_PORT}`);
      resolve();
    });
    
    socket.on('error', (err) => {
      console.error(`[Wrapper] Socket error: ${err.message}`);
      reject(err);
    });
    
    socket.on('close', () => {
      console.error(`[Wrapper] TCP connection closed`);
      process.exit(0);
    });
    
    // Read from TCP, write to stdout
    socket.on('data', (chunk) => {
      process.stdout.write(chunk);
    });
  });
}

// Read from stdin, write to TCP
process.stdin.on('data', (chunk) => {
  if (socket && !socket.destroyed) {
    socket.write(chunk);
  }
});

process.stdin.on('end', () => {
  if (socket) {
    socket.end();
  }
});

connectToServer().catch((err) => {
  console.error(`[Wrapper] Failed to connect: ${err.message}`);
  process.exit(1);
});

process.stdin.resume();

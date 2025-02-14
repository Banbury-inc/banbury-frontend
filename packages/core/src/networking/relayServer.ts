
import * as net from 'net';
import { CONFIG } from '../config';

let senderSocket: net.Socket | null = null;

export function connect(): net.Socket {
  const RELAY_HOST = CONFIG.relayHost; // Change this to your actual server IP
  const RELAY_PORT = CONFIG.relayPort;


  // Create a new socket and connect
  senderSocket = new net.Socket();
  senderSocket.connect(RELAY_PORT, RELAY_HOST, () => {
    console.log("Connected to the server.");
  });

  // Add error handling to log or handle errors
  senderSocket.on('error', (err) => {
    console.error("Error connecting to the relay server:", err);
  });

  senderSocket.on('close', () => {
    console.log("Socket is now closed.");
  });

  return senderSocket;
}




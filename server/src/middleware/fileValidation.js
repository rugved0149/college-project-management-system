import fs from 'node:fs/promises';
import net from 'node:net';
import { createReadStream } from 'node:fs';

const signatures = {
  '.pdf': buffer => buffer.subarray(0, 5).toString() === '%PDF-',
  '.png': buffer => buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),
  '.jpg': buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  '.jpeg': buffer => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  '.doc': buffer => buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])),
  '.ppt': buffer => buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])),
  '.xls': buffer => buffer.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1])),
  '.docx': buffer => isZip(buffer),
  '.pptx': buffer => isZip(buffer),
  '.xlsx': buffer => isZip(buffer),
  '.zip': buffer => isZip(buffer)
};

function isZip(buffer) {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b &&
    [[0x03,0x04],[0x05,0x06],[0x07,0x08]].some(([a,b]) => buffer[2] === a && buffer[3] === b);
}

export async function validateFileSignature(filePath, extension) {
  const check = signatures[extension.toLowerCase()];
  if (!check) throw Object.assign(new Error('Unsupported file extension'), { status: 400 });
  const file = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(8);
    const { bytesRead } = await file.read(buffer, 0, 8, 0);
    if (!check(buffer.subarray(0, bytesRead))) throw Object.assign(new Error('File content does not match its extension. Upload a genuine supported document.'), { status: 400 });
  } finally { await file.close(); }
}

export async function scanWithClamAV(filePath) {
  const host = process.env.CLAMAV_HOST;
  if (!host) {
    if (process.env.REQUIRE_MALWARE_SCAN === 'true') throw Object.assign(new Error('Malware scanning is required but CLAMAV_HOST is not configured.'), { status: 503 });
    return { scanned: false, reason: 'scanner_not_configured' };
  }
  const port = Number(process.env.CLAMAV_PORT || 3310);
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let response = '';
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      error ? reject(error) : resolve(result);
    };
    socket.setTimeout(30000, () => finish(Object.assign(new Error('Malware scanner timed out'), { status: 503 })));
    socket.on('error', () => finish(Object.assign(new Error('Malware scanner is unavailable'), { status: 503 })));
    socket.on('close', () => { if (!settled) finish(Object.assign(new Error('Malware scanner closed the connection unexpectedly'), { status: 503 })); });
    socket.on('data', chunk => {
      response += chunk.toString('utf8');
      if (response.includes(' FOUND')) finish(Object.assign(new Error('Upload rejected: malware detected'), { status: 422 }));
      else if (response.includes(' OK')) finish(null, { scanned: true, result: 'clean' });
      else if (response.includes(' ERROR')) finish(Object.assign(new Error('Malware scanner could not inspect this file'), { status: 503 }));
    });
    socket.on('connect', async () => {
      try {
        await write(socket, Buffer.from('zINSTREAM\\0'));
        for await (const chunk of createReadStream(filePath)) {
          const header = Buffer.alloc(4);
          header.writeUInt32BE(chunk.length, 0);
          await write(socket, header);
          await write(socket, chunk);
        }
        await write(socket, Buffer.alloc(4));
      } catch (error) { finish(Object.assign(new Error('Could not send file to malware scanner'), { status: 503, cause: error })); }
    });
  });
}

function write(socket, buffer) {
  return new Promise((resolve, reject) => socket.write(buffer, error => error ? reject(error) : resolve()));
}

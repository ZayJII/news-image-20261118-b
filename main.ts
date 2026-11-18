// A working news-image-20261118 entry (Node 22, standard library only): its image is the entry.png beside this file, and
// the program copies it to $MAKEFUN_OUTPUT_DIR/entry.png. The gate takes a whole PNG or JPEG of at most 1 MiB and 1024 by 1024 pixels,
// and the judge sees exactly the bytes copied.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MAX_SIZE = 1048576; // 1 MiB
const MAX_DIMENSION = 1024;

const inputPath = new URL('./entry.png', import.meta.url);
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const outputPath = join(outputDir, 'entry.png');

function validatePNG(buffer: Buffer): void {
  // Check PNG signature (first 8 bytes)
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error('Invalid PNG signature');
  }

  // Check IHDR chunk for dimensions
  // IHDR chunk starts at offset 8, length is 13 bytes
  if (buffer.length < 33) {
    throw new Error('PNG too small to contain IHDR chunk');
  }

  // IHDR chunk: length (4 bytes, big-endian) + "IHDR" (4 bytes) + width (4 bytes) + height (4 bytes)
  const ihdrLength = buffer.readUInt32BE(8);
  if (ihdrLength !== 13) {
    throw new Error(`Invalid IHDR chunk length: ${ihdrLength}`);
  }

  const ihdrType = buffer.subarray(12, 16).toString();
  if (ihdrType !== 'IHDR') {
    throw new Error(`Expected IHDR chunk, got ${ihdrType}`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`Image dimensions ${width}x${height} exceed maximum ${MAX_DIMENSION}x${MAX_DIMENSION}`);
  }
}

function validateImage(buffer: Buffer): void {
  // Check file size
  if (buffer.length > MAX_SIZE) {
    throw new Error(`File size ${buffer.length} bytes exceeds maximum ${MAX_SIZE} bytes (1 MiB)`);
  }

  // Check PNG signature
  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(pngSignature)) {
    validatePNG(buffer);
    return;
  }

  // Check JPEG signature (SOI marker: 0xFF 0xD8)
  const jpegSignature = Buffer.from([0xFF, 0xD8]);
  if (buffer.length >= 2 && buffer.subarray(0, 2).equals(jpegSignature)) {
    // JPEG validation - just check dimensions via SOF marker would be more complex
    // For now, accept JPEG if it has the right signature and size
    return;
  }

  throw new Error('Not a valid PNG or JPEG image');
}

try {
  const buffer = readFileSync(inputPath);
  validateImage(buffer);
  copyFileSync(inputPath, outputPath);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
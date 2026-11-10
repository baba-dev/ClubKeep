/**
 * Offline QR Model 2, version 7-L, mask 0 (45×45). Fixed-size encoder for
 * ClubKeep's short invitation URL. No hosted QR service ever sees the token.
 * Capacity: 154 UTF-8 bytes. Error correction: 2 × 20 Reed-Solomon bytes.
 */
function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsEcc(data: number[], degree: number): number[] {
  const divisor = new Uint8Array(degree);
  divisor[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      divisor[j] = gfMultiply(divisor[j], root);
      if (j + 1 < degree) divisor[j] ^= divisor[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  const remainder = new Uint8Array(degree);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.copyWithin(0, 1);
    remainder[degree - 1] = 0;
    for (let j = 0; j < degree; j++) remainder[j] ^= gfMultiply(divisor[j], factor);
  }
  return [...remainder];
}

export function inviteQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 154) throw new Error("Invitation URL exceeds QR capacity");
  const bits: number[] = [];
  const addBits = (count: number, value: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  addBits(4, 4); // byte mode
  addBits(8, bytes.length);
  for (const byte of bytes) addBits(8, byte);
  for (let i = 0; i < Math.min(4, 1248 - bits.length); i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    data.push(byte);
  }
  while (data.length < 156) data.push(data.length % 2 === 0 ? 0xec : 0x11);
  const blocks = [data.slice(0, 78), data.slice(78)];
  const encoded: number[] = [];
  for (let i = 0; i < 78; i++) for (const block of blocks) encoded.push(block[i]);
  const ecc = blocks.map((block) => rsEcc(block, 20));
  for (let i = 0; i < 20; i++) for (const block of ecc) encoded.push(block[i]);

  const size = 45;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const functions = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  function setFunction(x: number, y: number, dark: boolean) {
    if (x >= 0 && y >= 0 && x < size && y < size) {
      modules[y][x] = dark;
      functions[y][x] = true;
    }
  }
  function finder(cx: number, cy: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(cx + dx, cy + dy, d !== 2 && d !== 4);
      }
    }
  }
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  for (let i = 8; i < size - 8; i++) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }
  const centers = [6, 22, 38];
  for (const x of centers) {
    for (const y of centers) {
      if ((x === 6 && (y === 6 || y === 38)) || (x === 38 && y === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }
  function drawFormat(mask: number) {
    const value = (1 << 3) | mask; // level L = 1
    let rem = value;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
    const format = ((value << 10) | rem) ^ 0x5412;
    const bit = (i: number) => ((format >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setFunction(8, i, bit(i));
    setFunction(8, 7, bit(6));
    setFunction(8, 8, bit(7));
    setFunction(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setFunction(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setFunction(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setFunction(8, size - 15 + i, bit(i));
    setFunction(8, size - 8, true);
  }
  drawFormat(0);
  let versionBch = 7;
  for (let i = 0; i < 12; i++)
    versionBch = (versionBch << 1) ^ (((versionBch >>> 11) & 1) * 0x1f25);
  const version = (7 << 12) | versionBch;
  for (let i = 0; i < 18; i++) {
    const dark = ((version >>> i) & 1) !== 0;
    setFunction(size - 11 + (i % 3), Math.floor(i / 3), dark);
    setFunction(Math.floor(i / 3), size - 11 + (i % 3), dark);
  }
  const encodedBits = encoded.flatMap((byte) =>
    Array.from({ length: 8 }, (_, i) => ((byte >>> (7 - i)) & 1) !== 0)
  );
  let offset = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) {
      const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical;
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        if (!functions[y][x]) modules[y][x] = encodedBits[offset++] ?? false;
      }
    }
  }
  if (offset !== encodedBits.length) throw new Error("QR layout mismatch");
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!functions[y][x] && (x + y) % 2 === 0) modules[y][x] = !modules[y][x];
    }
  }
  drawFormat(0);
  return modules;
}

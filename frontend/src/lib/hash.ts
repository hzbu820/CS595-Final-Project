const encoder = new TextEncoder();

export const bufferToHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export const computeSha256Hex = async (input: string | ArrayBuffer | Uint8Array | File) => {
  let data: ArrayBuffer;
  if (input instanceof File) {
    data = await input.arrayBuffer();
  } else if (typeof input === 'string') {
    data = encoder.encode(input).buffer;
  } else if (input instanceof ArrayBuffer) {
    data = input.slice(0);
  } else if (input instanceof Uint8Array) {
    const view = input.slice();
    data = view.buffer;
  } else {
    throw new Error('Unsupported input type for hashing');
  }

  const hash = await crypto.subtle.digest('SHA-256', data);
  return `0x${bufferToHex(hash)}`;
};

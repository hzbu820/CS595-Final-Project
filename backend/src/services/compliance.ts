import { keccak256, toUtf8Bytes } from 'ethers';

// Mock proofs of compliance
export async function checkTemperature(batchId: string): Promise<boolean> {
  const mockTemps = [5, 7, 6, 8]; 
  return mockTemps.every(t => t < 10);
}

export function createCommitment(data: any): string {
  return keccak256(toUtf8Bytes(JSON.stringify(data)));
}
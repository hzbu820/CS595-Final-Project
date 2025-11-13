import { useState, type FormEvent } from 'react';
import { verifyEventFile } from '../../lib/api';
import { useWallet } from '../../context/walletContext';

export const VerifyScreen = () => {
  const { contract } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [eventIndex, setEventIndex] = useState('0');
  const [fallbackHash, setFallbackHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking'>('idle');
  const [result, setResult] = useState<{ sha256: string; matches?: boolean } | null>(null);
  const [expected, setExpected] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Select a JSON file.');
      return;
    }

    setStatus('checking');
    setError(null);
    setResult(null);
    setExpected('');

    try {
      let expectedHash = fallbackHash.trim();
      if (!expectedHash && contract && batchId) {
        const rawIndex = Number(eventIndex);
        const onChain = await (contract as any).getEvent(batchId, rawIndex);
        expectedHash = onChain.dataHash;
        setExpected(onChain.dataHash);
      }

      const verify = await verifyEventFile({ file, expectedHash: expectedHash || undefined });
      setResult(verify);
      if (!expectedHash) {
        setExpected(verify.sha256);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <form className="screen-card form" onSubmit={onSubmit}>
      <h2>Verify Event JSON</h2>
      <p className="screen-description">
        Upload a JSON document and ensure its SHA-256 hash matches the on-chain record (looked up via getEvent).
      </p>

      <div className="form-grid">
        <label>
          Batch ID
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Event Index
          <input type="number" min="0" value={eventIndex} onChange={(e) => setEventIndex(e.target.value)} />
        </label>
      </div>

      <label>
        Expected Hash (optional)
        <input value={fallbackHash} onChange={(e) => setFallbackHash(e.target.value)} placeholder="0x..." />
      </label>

      <label className="file-picker">
        Event JSON
        <input type="file" accept="application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'checking' ? 'Verifying...' : 'Verify Hash'}
      </button>

      {expected && (
        <div className="callout">
          Expected on-chain hash: <code>{expected}</code>
        </div>
      )}

      {result && (
        <div className="callout">
          <p>Computed hash: {result.sha256}</p>
          {result.matches !== undefined && (
            <p className={result.matches ? 'success' : 'error'}>
              Match: {result.matches ? 'Yes' : 'No'}
            </p>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </form>
  );
};

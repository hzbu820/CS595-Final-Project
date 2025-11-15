import { useState, type FormEvent } from 'react';
import { verifyEventFile } from '../../lib/api';
import { useWallet } from '../../context/walletContext';

export const VerifyScreen = () => {
  const { contract } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [eventIndex, setEventIndex] = useState('0');
  const [fallbackHash, setFallbackHash] = useState('');
  const [fallbackSalt, setFallbackSalt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking'>('idle');
  const [result, setResult] = useState<{
    sha256: string;
    saltedHash?: string;
    matches?: boolean;
    matchesSalted?: boolean;
  } | null>(null);
  const [expected, setExpected] = useState<string>('');
  const [expectedSalted, setExpectedSalted] = useState<string>('');
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
    setExpectedSalted('');

    try {
      let expectedHash = fallbackHash.trim();
      let expectedSaltedHash = fallbackSalt.trim();
      if ((!expectedHash || !expectedSaltedHash) && contract && batchId) {
        const rawIndex = Number(eventIndex);
        const onChain = await (contract as any).getEvent(batchId, rawIndex);
        expectedSaltedHash = onChain.dataHash;
        setExpectedSalted(onChain.dataHash);
      }

      const verify = await verifyEventFile({
        file,
        expectedHash: expectedHash || undefined,
        expectedSaltedHash: expectedSaltedHash || undefined,
        salt: fallbackSalt || undefined,
      });
      setResult(verify);
      if (!expectedHash && verify.sha256) {
        setExpected(verify.sha256);
      }
      if (!expectedSaltedHash && verify.saltedHash) {
        setExpectedSalted(verify.saltedHash);
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
        Upload a JSON document, provide the associated salt, and ensure its salted hash matches the on-chain record.
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
        <input value={fallbackHash} onChange={(e) => setFallbackHash(e.target.value)} placeholder="Raw SHA-256" />
      </label>

      <label>
        Salt (32-byte hex)
        <input value={fallbackSalt} onChange={(e) => setFallbackSalt(e.target.value)} placeholder="0x..." />
      </label>

      <label className="file-picker">
        Event JSON
        <input type="file" accept="application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'checking' ? 'Verifying...' : 'Verify Hash'}
      </button>

      {(expected || expectedSalted) && (
        <div className="callout">
          {expected && (
            <p>
              Raw SHA-256: <code>{expected}</code>
            </p>
          )}
          {expectedSalted && (
            <p>
              On-chain salted hash: <code>{expectedSalted}</code>
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="callout">
          <p>Computed raw hash: {result.sha256}</p>
          {result.saltedHash && <p>Computed salted hash: {result.saltedHash}</p>}
          {result.matches !== undefined && (
            <p className={result.matches ? 'success' : 'error'}>
              Raw hash match: {result.matches ? 'Yes' : 'No'}
            </p>
          )}
          {result.matchesSalted !== undefined && (
            <p className={result.matchesSalted ? 'success' : 'error'}>
              Salted hash match: {result.matchesSalted ? 'Yes' : 'No'}
            </p>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </form>
  );
};

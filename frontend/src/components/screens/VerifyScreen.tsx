import { useState, type FormEvent } from 'react';
import { verifyStoredEvent, fetchStoredEvent } from '../../lib/api';
import { computeSha256Hex } from '../../lib/hash';

export const VerifyScreen = () => {
  const [batchId, setBatchId] = useState('');
  const [cid, setCid] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking'>('idle');
  const [result, setResult] = useState<{ recomputed?: string; recorded?: string; match?: boolean } | null>(null);
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('checking');
    setError(null);
    setResult(null);
    setDownloaded(null);

    try {
      const verify = await verifyStoredEvent(batchId, cid);
      setResult(verify);
      const stored = await fetchStoredEvent(batchId, cid);
      setDownloaded(JSON.stringify(stored, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  };

  const computeLocalHash = async (nextFile: File) => {
    setLocalHash('Computing...');
    try {
      const hash = await computeSha256Hex(nextFile);
      setLocalHash(hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <form className="screen-card form" onSubmit={onSubmit}>
      <h2>Verify Stored Event</h2>
      <p className="screen-description">
        Given a batchId + CID, ask the backend to recompute the salted hash from the stored envelope and confirm it
        matches what was recorded. Optionally compute a local SHA-256 of a JSON file to compare with the stored envelope.
      </p>

      <div className="form-grid">
        <label>
          Batch ID
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
        </label>
        <label>
          CID
          <input value={cid} onChange={(e) => setCid(e.target.value)} required />
        </label>
      </div>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'checking' ? 'Verifying...' : 'Verify Stored Hash'}
      </button>

      <label className="file-picker">
        Optional: upload JSON to compute raw SHA-256
        <input
          type="file"
          accept="application/json"
          onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setFile(selected);
            if (selected) computeLocalHash(selected);
          }}
        />
      </label>

      {result && (
        <div className="callout">
          <p>Recorded hash: {result.recorded}</p>
          <p>Recomputed: {result.recomputed}</p>
          {result.match !== undefined && (
            <p className={result.match ? 'success' : 'error'}>Match: {result.match ? 'Yes' : 'No'}</p>
          )}
        </div>
      )}

      {localHash && (
        <div className="callout">
          <p>Local raw SHA-256: {localHash}</p>
          {file && <p>File: {file.name}</p>}
        </div>
      )}

      {downloaded && (
        <div className="callout">
          <p>Stored envelope:</p>
          <pre>{downloaded}</pre>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </form>
  );
};

import { useState, type FormEvent } from 'react';
import { uploadEventFile } from '../../lib/api';
import { useWallet } from '../../context/walletContext';

type UploadResponse = {
  batchId: string;
  cid: string;
  sha256: string;
  saltedHash: string;
  salt: string;
  uri: string;
  metadataUri: string;
  size: number;
};

const EVENT_OPTIONS = ['STORAGE', 'TRANSPORT', 'INSPECTION', 'RETAIL', 'SALE'];

export const AppendEventScreen = () => {
  const { contract, account } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [eventType, setEventType] = useState(EVENT_OPTIONS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'sending'>('idle');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setTxHash(null);

    if (!contract || !account) {
      setError('Connect your wallet first.');
      return;
    }
    if (!file) {
      setError('Upload the event JSON first.');
      return;
    }

    try {
      setStatus('uploading');
      const upload = await uploadEventFile({
        file,
        batchId,
        eventType,
        actor: account,
      });
      setResult(upload);

      setStatus('sending');
      const tx = await contract.appendEvent(batchId, eventType, upload.cid, upload.saltedHash);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <form className="screen-card form" onSubmit={onSubmit}>
      <h2>Append Event</h2>
      <p className="screen-description">
        Custodians upload the latest inspection/logistics report, the backend salts + hashes it, and we commit the salted
        hash on-chain. Store the salt securely for verification.
      </p>

      <label>
        Batch ID
        <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required placeholder="BATCH-2025-001" />
      </label>

      <label>
        Event Type
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {EVENT_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>

      <label className="file-picker">
        Event JSON
        <input type="file" accept="application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'uploading' && 'Uploading...'}
        {status === 'sending' && 'Sending Tx...'}
        {status === 'idle' && 'Append Event'}
      </button>

      {result && (
        <div className="callout">
          <p>
            CID <code>{result.cid}</code>
          </p>
          <p>SHA-256: {result.sha256}</p>
          <p>Salted hash (on-chain): {result.saltedHash}</p>
          <p>Salt: {result.salt}</p>
        </div>
      )}

      {txHash && (
        <p className="success">
          Tx:{' '}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash.slice(0, 12)}...
          </a>
        </p>
      )}

      {error && <p className="error">{error}</p>}
    </form>
  );
};

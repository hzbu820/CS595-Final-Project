import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';
import { uploadSignedEvent, updateEventStatus } from '../../lib/api';
import { signEventPayload } from '../../lib/signing';
import { useAuth } from '../../context/authContext';

type UploadResponse = {
  batchId: string;
  sha256: string;
  saltedHash: string;
  salt: string;
  cid: string;
  uri: string;
  status: string;
};

const EVENT_OPTIONS = ['Transport', 'Inspect'];

const buildSampleEvent = () => ({
  temperatureC: Number((2 + Math.random() * 4).toFixed(1)),
  humidity: Number((60 + Math.random() * 10).toFixed(1)),
  gps: {
    lat: Number((40 + Math.random()).toFixed(6)),
    lng: Number((-74 + Math.random()).toFixed(6)),
  },
  ts: Math.floor(Date.now() / 1000),
  note: 'AI generated test data',
});

export const AppendEventScreen = () => {
  const { provider, contract, account } = useWallet();
  const { effectiveRole } = useAuth();
  const [batchId, setBatchId] = useState('0x');
  const [eventType, setEventType] = useState<string>(EVENT_OPTIONS[0]);
  const [dataJson, setDataJson] = useState(JSON.stringify(buildSampleEvent(), null, 2));
  const [status, setStatus] = useState<'idle' | 'signing' | 'uploading' | 'sending'>('idle');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    setTxHash(null);

    if (!provider || !contract || !account) {
      setError('Connect your wallet first.');
      return;
    }

    let parsedData: Record<string, unknown>;
    try {
      parsedData = JSON.parse(dataJson);
    } catch {
      setError('Event data must be valid JSON.');
      return;
    }

    if (!batchId.startsWith('0x')) {
      setError('Batch ID must be 0x-prefixed (32-byte hex).');
      return;
    }

    if (batchId.length !== 66) {
      setError('Batch ID must be 32 bytes (0x + 64 hex chars).');
      return;
    }

    try {
      setStatus('signing');
      const signature = await signEventPayload(provider, {
        batchId,
        eventType,
        data: JSON.stringify(parsedData ?? {}),
      });

      setStatus('uploading');
      const upload = await uploadSignedEvent({
        batchId,
        eventType,
        data: parsedData,
        signature,
        signer: account,
      });
      setResult(upload);

      setStatus('sending');
      const tx = await contract["appendEvent(string,string,string,bytes32)"](batchId, eventType, upload.cid, upload.saltedHash);
      setPendingTx(tx.hash);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await updateEventStatus(upload.cid, 'confirmed', receipt.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (result?.cid) {
        try {
          await updateEventStatus(result.cid, 'failed', pendingTx ?? undefined);
        } catch {
          /* ignore secondary error */
        }
      }
    } finally {
      setStatus('idle');
    }
  };

  return (
    <form className="screen-card form" onSubmit={onSubmit}>
      <h2>Append Event</h2>
      <p className="screen-description">
        Custodians sign the payload (EIP-712), the backend salts/stores it (status pending), and the salted hash is
        appended on-chain. After the tx settles we ping the backend to flip to confirmed/failed.
      </p>

      <label>
        Batch ID (0x + 64 hex)
        <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
      </label>

      <label>
        Event Type
        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          {EVENT_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>

      <label>
        Event payload (JSON)
        <textarea
          rows={8}
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="auth-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={() => setDataJson(JSON.stringify(buildSampleEvent(), null, 2))}
        >
          Generate sample event
        </button>
      </div>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'signing' && 'Signing...'}
        {status === 'uploading' && 'Uploading...'}
        {status === 'sending' && 'Waiting for tx...'}
        {status === 'idle' && 'Append Event'}
      </button>

      {result && (
        <div className="callout">
          <p>Backend status: {result.status}</p>
          <p>CID: {result.cid}</p>
          <p>Salted hash (on-chain): {result.saltedHash}</p>
          <p>Salt: {result.salt}</p>
          <p>Stored at: {result.uri}</p>
        </div>
      )}

      {txHash && (
        <p className="success">
          Tx confirmed:{' '}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash.slice(0, 12)}...
          </a>
        </p>
      )}

      {error && <p className="error">{error}</p>}
      <p className="screen-tips">UI role: {effectiveRole}. Allowed event types follow backend role checks.</p>
    </form>
  );
};

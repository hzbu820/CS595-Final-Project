import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';
import { fetchStoredEvent, verifyStoredEvent } from '../../lib/api';
import { formatTimestamp } from '../../lib/format';

interface BatchSummary {
  batchId: string;
  creator: string;
  currentCustodian: string;
  recalled: boolean;
  recallReason: string;
  createdAt: bigint;
}

interface EventRecord {
  eventType: string;
  actor: string;
  cid: string;
  dataHash: string;
  timestamp: bigint;
}

interface EventMetadata {
  batchId: string;
  sha256: string;
  saltedHash: string;
  salt: string;
  signer?: string;
  createdAt?: string | number;
}

export const ViewerScreen = () => {
  const { contract, role } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadedCid, setDownloadedCid] = useState<string | null>(null);
  const [downloadedJson, setDownloadedJson] = useState<string>('');
  const [downloadedMeta, setDownloadedMeta] = useState<EventMetadata | null>(null);
  const [verification, setVerification] = useState<{ ok: boolean; match?: boolean } | null>(null);

  const canViewEnvelope = role === 'Regulator';

  const onSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract) {
      setError('Connect wallet to query the contract.');
      return;
    }
    setLoading(true);
    setError(null);
    setSummary(null);
    setEvents([]);
    try {
      const [rawSummary, rawEvents] = await contract.getBatchSummary(batchId);
      setSummary(rawSummary as BatchSummary);
      setEvents(rawEvents as EventRecord[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cid: string) => {
    try {
      const json = await fetchStoredEvent(batchId, cid);
      const envelope = (json as any).envelope;
      const metadata: EventMetadata | null = envelope
        ? {
            batchId: envelope.payload?.batchId,
            sha256: envelope.sha256,
            saltedHash: envelope.sha256,
            salt: envelope.salt,
            signer: envelope.signer,
            createdAt: envelope.createdAt,
          }
        : null;

      const verificationResult = await verifyStoredEvent(batchId, cid);

      setDownloadedCid(cid);
      setDownloadedJson(JSON.stringify(json, null, 2));
      setDownloadedMeta(metadata);
      setVerification(verificationResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  };

  return (
    <div className="screen-card viewer">
      <form onSubmit={onSearch} className="form-inline">
        <input
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          placeholder="Batch ID"
          required
        />
        <button className="primary" type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Load Batch'}
        </button>
      </form>

      {summary && (
        <div className="summary">
          <h3>Summary</h3>
          <p>Creator: {summary.creator}</p>
          <p>Custodian: {summary.currentCustodian}</p>
          <p>Created: {formatTimestamp(summary.createdAt)}</p>
          <p>
            Recall Status: {summary.recalled ? 'Recalled' : 'Clear'}{' '}
            {summary.recalled && summary.recallReason && `(${summary.recallReason})`}
          </p>
        </div>
      )}

      {events.length > 0 && (
        <div className="timeline">
          <h3>Timeline</h3>
          <ul>
            {events.map((event) => (
              <li key={`${event.timestamp.toString()}-${event.cid}`}>
                <p>
                  <strong>{event.eventType}</strong> by {event.actor} - {formatTimestamp(event.timestamp)}
                </p>
                <p>Salted hash (on-chain): {event.dataHash}</p>
                {event.cid && canViewEnvelope && (
                  <button type="button" className="ghost-button" onClick={() => handleDownload(event.cid)}>
                    Fetch JSON ({event.cid})
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {downloadedCid && canViewEnvelope && (
        <div className="callout">
          <p>Downloaded CID: {downloadedCid}</p>
          {downloadedMeta && (
            <>
              <p>Raw SHA-256: {downloadedMeta.sha256}</p>
              <p>Salted hash: {downloadedMeta.saltedHash}</p>
              <p>Salt: {downloadedMeta.salt}</p>
              {downloadedMeta.signer && <p>Signer: {downloadedMeta.signer}</p>}
            </>
          )}
          {verification && (
            <p className={verification.match ? 'success' : 'error'}>
              Backend re-hash match: {verification.match ? 'Yes' : 'No'}
            </p>
          )}
          <pre>{downloadedJson}</pre>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};

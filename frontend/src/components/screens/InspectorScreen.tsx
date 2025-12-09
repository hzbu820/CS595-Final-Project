import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';
import { fetchStoredEvent } from '../../lib/api';
import { formatTimestamp } from '../../lib/format';

type BatchSummary = {
  batchId: string;
  creator: string;
  currentCustodian: string;
  recalled: boolean;
  recallReason: string;
  createdAt: bigint;
};

type EventRecord = {
  eventType: string;
  actor: string;
  cid: string;
  dataHash: string;
  timestamp: bigint;
};

type FlaggedEvent = {
  cid: string;
  eventType: string;
  actor: string;
  timestamp: bigint;
  data?: Record<string, unknown>;
  reason: string;
};

const extractData = (json: any): Record<string, unknown> | undefined => {
  if (!json) return undefined;
  if (json.envelope?.payload?.data) return json.envelope.payload.data as Record<string, unknown>;
  if (json.payload?.data) return json.payload.data as Record<string, unknown>;
  if (json.data) return json.data as Record<string, unknown>;
  return undefined;
};

const temperatureFromData = (data?: Record<string, unknown>) => {
  if (!data) return undefined;
  const candidates = ['temperature', 'temp', 'tempC', 'temperatureC'];
  for (const key of candidates) {
    const value = data[key];
    if (typeof value === 'number') return value;
  }
  return undefined;
};

export const InspectorScreen = () => {
  const { contract } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [threshold, setThreshold] = useState('10');
  const [summary, setSummary] = useState<BatchSummary | null>(null);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [flagged, setFlagged] = useState<FlaggedEvent[]>([]);
  const [recallReason, setRecallReason] = useState('Inspector flagged anomalies');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'recalling'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract) {
      setError('Connect wallet (Regulator) to inspect.');
      return;
    }
    setError(null);
    setSummary(null);
    setEvents([]);
    setFlagged([]);
    setTxHash(null);
    setStatus('loading');

    try {
      const [rawSummary, rawEvents] = await contract.getBatchSummary(batchId);
      const typedSummary = rawSummary as BatchSummary;
      const typedEvents = rawEvents as EventRecord[];
      setSummary(typedSummary);
      setEvents(typedEvents);

      const limit = Number(threshold) || 0;
      const flaggedEvents: FlaggedEvent[] = [];

      for (const ev of typedEvents) {
        if (!ev.cid) continue;
        try {
          const json = await fetchStoredEvent(batchId, ev.cid);
          const data = extractData(json);
          const temp = temperatureFromData(data);
          const reasons: string[] = [];
          if (temp !== undefined && temp > limit) {
            reasons.push(`Temperature ${temp} exceeds threshold ${limit}`);
          }
          if (reasons.length > 0) {
            flaggedEvents.push({
              cid: ev.cid,
              eventType: ev.eventType,
              actor: ev.actor,
              timestamp: ev.timestamp,
              data,
              reason: reasons.join('; '),
            });
          }
        } catch (fetchErr) {
          console.warn('Unable to fetch event JSON', fetchErr);
        }
      }
      setFlagged(flaggedEvents);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  };

  const handleRecall = async () => {
    if (!contract) {
      setError('Connect wallet (Regulator) to submit recall.');
      return;
    }
    setStatus('recalling');
    setError(null);
    setTxHash(null);
    try {
      const tx = await contract.setRecall(batchId, recallReason || 'Inspector recall');
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
    <div className="screen-card form">
      <h2>Inspector Review</h2>
      <p className="screen-description">
        Inspectors load a batch, auto-flag anomalies (e.g., temperature above threshold), and optionally recommend/trigger recall.
      </p>

      <form className="form-grid" onSubmit={onSubmit}>
        <label>
          Batch ID
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required placeholder="0x..." />
        </label>
        <label>
          Temperature threshold (°C)
          <input
            type="number"
            min="0"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="10"
          />
        </label>
        <button className="primary" type="submit" disabled={status !== 'idle'}>
          {status === 'loading' ? 'Scanning...' : 'Inspect Batch'}
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

      {flagged.length > 0 && (
        <div className="timeline">
          <h3>Flagged events ({flagged.length})</h3>
          <ul>
            {flagged.map((ev) => (
              <li key={`${ev.timestamp.toString()}-${ev.cid}`}>
                <p>
                  <strong>{ev.eventType}</strong> by {ev.actor} — {formatTimestamp(ev.timestamp)}
                </p>
                <p className="error">{ev.reason}</p>
                {ev.data && <pre>{JSON.stringify(ev.data, null, 2)}</pre>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {flagged.length === 0 && events.length > 0 && (
        <p className="screen-coming-soon">No anomalies found with the current threshold.</p>
      )}

      {flagged.length > 0 && (
        <div className="callout">
          <label>
            Recall reason
            <input value={recallReason} onChange={(e) => setRecallReason(e.target.value)} />
          </label>
          <button className="primary" type="button" onClick={handleRecall} disabled={status !== 'idle'}>
            {status === 'recalling' ? 'Submitting...' : 'Trigger Recall'}
          </button>
          {txHash && (
            <p className="success">
              Recall tx:{' '}
              <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                {txHash.slice(0, 12)}...
              </a>
            </p>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
};

import { useMemo, useState, type FormEvent } from 'react';
import { createBatchEnvelope, updateBatchStatus } from '../../lib/api';
import { useWallet } from '../../context/walletContext';
import { signEventPayload } from '../../lib/signing';
import { useAuth } from '../../context/authContext';

type UploadResponse = {
  batchId: string;
  cid: string;
  sha256: string;
  saltedHash: string;
  salt: string;
  uri: string;
  metadataUri: string;
  status: string;
  custodian?: string;
};

const buildSampleMeta = () => ({
  product: 'Chilled Atlantic salmon',
  origin: 'US-WA-Plant-18',
  productionDate: Math.floor(Date.now() / 1000),
  lot: `LOT-${Math.floor(Math.random() * 10000)}`,
  temperatureC: Number((2 + Math.random() * 3).toFixed(1)),
  notes: 'AI generated test data',
});

export const CreateBatchScreen = () => {
  const { provider, contract, account, role, status: walletStatus } = useWallet();
  const { effectiveRole } = useAuth();
  const [batchId, setBatchId] = useState('0x');
  const [custodian, setCustodian] = useState('');
  const [metaJson, setMetaJson] = useState(JSON.stringify(buildSampleMeta(), null, 2));
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'signing' | 'uploading' | 'sending'>('idle');

  const firstCustodian = useMemo(
    () => custodian || uploadInfo?.custodian || account || '',
    [account, custodian, uploadInfo?.custodian],
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTxHash(null);
    setUploadInfo(null);

    if (!provider || !contract || !account) {
      setError('Connect your wallet first.');
      return;
    }

    let parsedMeta: Record<string, unknown>;
    try {
      parsedMeta = JSON.parse(metaJson);
    } catch {
      setError('Meta must be valid JSON.');
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
        eventType: 'Create',
        data: JSON.stringify(parsedMeta ?? {}),
      });

      setStatus('uploading');
      const upload = await createBatchEnvelope({
        batchId,
        meta: parsedMeta,
        signature,
        signer: account,
        custodian: firstCustodian || account,
      });
      setUploadInfo(upload);

      setStatus('sending');
      const tx = await contract.createBatch(
        batchId,
        upload.custodian ?? firstCustodian ?? account,
        upload.cid,
        upload.saltedHash,
      );
      setPendingTx(tx.hash);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      await updateBatchStatus(batchId, 'confirmed', receipt.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      if (uploadInfo?.cid || pendingTx) {
        try {
          await updateBatchStatus(batchId, 'failed', pendingTx ?? undefined);
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
      <h2>Create Batch</h2>
      <p className="screen-description">
        Producers sign the genesis payload (EIP-712), send it to the backend for salting/storage (pending), then anchor
        the salted hash on Sepolia with <code>createBatch</code>. After the on-chain tx resolves we mark the backend row
        confirmed/failed.
      </p>

      <div className="form-grid">
        <label>
          Batch ID (0x + 64 hex)
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
        </label>
        <label>
          First Custodian (defaults to wallet)
          <input
            value={firstCustodian}
            onChange={(e) => setCustodian(e.target.value)}
            placeholder={account ?? '0x...'}
          />
        </label>
      </div>

      <label>
        Batch metadata (JSON)
        <textarea
          rows={8}
          value={metaJson}
          onChange={(e) => setMetaJson(e.target.value)}
          spellCheck={false}
        />
      </label>
      <div className="auth-actions">
        <button
          className="ghost-button"
          type="button"
          onClick={() => setMetaJson(JSON.stringify(buildSampleMeta(), null, 2))}
        >
          Generate sample meta
        </button>
      </div>

      <button className="primary" type="submit" disabled={status !== 'idle' || walletStatus !== 'idle'}>
        {status === 'signing' && 'Signing...'}
        {status === 'uploading' && 'Uploading...'}
        {status === 'sending' && 'Waiting for tx...'}
        {status === 'idle' && 'Create Batch'}
      </button>

      {uploadInfo && (
        <div className="callout">
          <p>Backend status: {uploadInfo.status}</p>
          <p>CID: {uploadInfo.cid}</p>
          <p>Salted hash (on-chain): {uploadInfo.saltedHash}</p>
          <p>Salt (keep private): {uploadInfo.salt}</p>
          <p>Stored at: {uploadInfo.uri}</p>
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
      <p className="screen-tips">Requires Producer role (UI role: {effectiveRole}, on-chain: {role}).</p>
    </form>
  );
};

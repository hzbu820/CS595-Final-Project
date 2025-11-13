import { useState, type FormEvent } from 'react';
import { uploadEventFile } from '../../lib/api';
import { useWallet } from '../../context/walletContext';

type UploadResponse = {
  cid: string;
  sha256: string;
  uri: string;
  size: number;
};

export const CreateBatchScreen = () => {
  const { contract, account, role, status } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [custodian, setCustodian] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadInfo, setUploadInfo] = useState<UploadResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTxHash(null);

    if (!contract || !account) {
      setError('Connect your wallet first.');
      return;
    }

    if (!batchId || !custodian) {
      setError('Fill out all fields.');
      return;
    }

    if (!file) {
      setError('Attach the initial batch JSON file.');
      return;
    }

    try {
      setSubmitting(true);
      const upload = await uploadEventFile({
        file,
        batchId,
        eventType: 'CREATE',
        actor: account,
      });
      setUploadInfo(upload);

      const tx = await contract.createBatch(batchId, custodian, upload.cid, upload.sha256);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="screen-card form" onSubmit={onSubmit}>
      <h2>Create Batch</h2>
      <p className="screen-description">
        Producers upload the genesis JSON payload, store it via the backend, and anchor the hash on Sepolia using
        `createBatch`.
      </p>

      <div className="form-grid">
        <label>
          Batch ID
          <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required placeholder="BATCH-2025-001" />
        </label>
        <label>
          First Custodian Address
          <input
            value={custodian}
            onChange={(e) => setCustodian(e.target.value)}
            required
            placeholder="0xabc..."
          />
        </label>
      </div>

      <label className="file-picker">
        Initial Event JSON
        <input type="file" accept="application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </label>

      <button className="primary" type="submit" disabled={submitting || status !== 'idle'}>
        {submitting ? 'Submitting...' : 'Create Batch'}
      </button>

      {uploadInfo && (
        <div className="callout">
          <p>
            Stored as <code>{uploadInfo.cid}</code> (hash {uploadInfo.sha256})
          </p>
          <p>
            Backend URI: <code>{uploadInfo.uri}</code>
          </p>
        </div>
      )}

      {txHash && (
        <p className="success">
          Tx complete:{' '}
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
            {txHash.slice(0, 12)}...
          </a>
        </p>
      )}

      {error && <p className="error">{error}</p>}
      <p className="screen-tips">Requires Producer role (you are {role}).</p>
    </form>
  );
};

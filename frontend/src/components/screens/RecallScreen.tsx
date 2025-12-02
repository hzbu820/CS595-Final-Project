import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';

export const RecallScreen = () => {
  const { contract } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');

  const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract) {
      setError('Connect your wallet first.');
      return;
    }
    setStatus('submitting');
    setError(null);
    setTxHash(null);
    try {
      const tx = await contract.setRecall(batchId, reason);
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
      <h2>Recall Management</h2>
      <p className="screen-description">Regulators toggle recall status and record a reason for auditors and the public.</p>

      <label>
        Batch ID
        <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
      </label>

      <label>
        Recall Reason
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Detected contamination" />
      </label>

      <button className="primary" type="submit" disabled={status !== 'idle'}>
        {status === 'submitting' ? 'Submitting...' : 'Trigger Recall'}
      </button>

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

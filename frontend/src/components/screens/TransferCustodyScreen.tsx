import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';

export const TransferCustodyScreen = () => {
  const { contract } = useWallet();
  const [batchId, setBatchId] = useState('');
  const [newCustodian, setNewCustodian] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contract) {
      setError('Connect your wallet first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setTxHash(null);
    try {
      const tx = await contract.transferCustody(batchId, newCustodian);
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
      <h2>Transfer Custody</h2>
      <p className="screen-description">Current custodian delegates ownership to the next trusted partner.</p>

      <label>
        Batch ID
        <input value={batchId} onChange={(e) => setBatchId(e.target.value)} required />
      </label>
      <label>
        New Custodian Address
        <input value={newCustodian} onChange={(e) => setNewCustodian(e.target.value)} required />
      </label>

      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Transfer'}
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

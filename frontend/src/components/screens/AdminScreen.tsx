import { useState, type FormEvent } from 'react';
import { useWallet } from '../../context/walletContext';


type RoleValue = 0 | 1 | 2 | 3;

export const AdminScreen = () => {
    const { contract, account } = useWallet();
    const [targetAddress, setTargetAddress] = useState('');
    const [selectedRole, setSelectedRole] = useState<RoleValue>(0);
    const [isOwner, setIsOwner] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'checking' | 'granting' | 'setup'>('idle');

    const checkAdminStatus = async () => {
        if (!contract || !account) {
            setError('Connect wallet first');
            return;
        }
        setStatus('checking');
        setError(null);
        try {
            const owner = await contract.owner();
            setIsOwner(owner.toLowerCase() === account.toLowerCase());
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        } finally {
            setStatus('idle');
        }
    };

    const onGrantRole = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!contract) {
            setError('Connect wallet first.');
            return;
        }
        setError(null);
        setTxHash(null);
        setStatus('granting');

        try {
            const tx = await contract.setRole(targetAddress, selectedRole);
            const receipt = await tx.wait();
            setTxHash(receipt.hash);
            setTargetAddress('');
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
        } finally {
            setStatus('idle');
        }
    };

    const onSetupDemo = async () => {
        if (!contract || !account) {
            setError('Connect wallet first.');
            return;
        }
        setError(null);
        setTxHash(null);
        setStatus('setup');

        try {
            // Set Producer role (0) - required to Create Batch in System Test
            const tx = await contract.setRole(account, 0);
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
            <h2>Admin Dashboard</h2>
            <p className="screen-description">
                Manage user roles and permissions. Only accessible to contract owner.
            </p>

            <div className="callout">
                <button className="ghost-button" type="button" onClick={checkAdminStatus} disabled={status !== 'idle'}>
                    {status === 'checking' ? 'Checking...' : 'Check Admin Status'}
                </button>
                {isOwner && (
                    <p className="success">
                        ✓ You are the Owner
                    </p>
                )}
                {error && <p className="error">{error}</p>}
            </div>

            <div className="callout">
                <h3>Demo Setup</h3>
                <p className="screen-description">
                    Grant yourself Producer role (required for System Test). Note: Each address can only have ONE role.
                </p>
                <button className="primary" type="button" onClick={onSetupDemo} disabled={status !== 'idle'}>
                    {status === 'setup' ? 'Setting up...' : 'Setup Demo User (Producer)'}
                </button>
            </div>

            <form className="form-grid" onSubmit={onGrantRole}>
                <h3>Grant Role</h3>
                <label>
                    User Address
                    <input
                        value={targetAddress}
                        onChange={(e) => setTargetAddress(e.target.value)}
                        placeholder="0x..."
                        required
                    />
                </label>
                <label>
                    Role
                    <select value={selectedRole} onChange={(e) => setSelectedRole(Number(e.target.value) as RoleValue)}>
                        <option value={0}>Producer</option>
                        <option value={1}>Transporter</option>
                        <option value={2}>Retailer</option>
                        <option value={3}>Regulator</option>
                    </select>
                </label>
                <div className="auth-actions">
                    <button className="primary" type="submit" disabled={status !== 'idle'}>
                        {status === 'granting' ? ' Granting...' : 'Grant Role'}
                    </button>
                </div>
            </form>

            {txHash && <p className="success">Transaction: {txHash.slice(0, 12)}...</p>}
        </div>
    );
};

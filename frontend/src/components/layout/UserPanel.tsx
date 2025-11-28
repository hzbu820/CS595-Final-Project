import { useAuth } from '../../context/authContext';
import { useWallet } from '../../context/walletContext';

interface Props {
  onOpenLogin: () => void;
}

export const UserPanel = ({ onOpenLogin }: Props) => {
  const { user, effectiveRole, status } = useAuth();
  const { role: walletRole } = useWallet();

  return (
    <div className="wallet-panel">
      <div className="wallet-meta">
        <p className="wallet-title">User</p>
        <p className="wallet-text">{user?.email ?? 'Guest session'}</p>
        <p className="wallet-role">UI Role: {effectiveRole}</p>
        <p className="wallet-role">On-chain Role: {walletRole}</p>
      </div>
      <div className="wallet-actions">
        <button className="ghost-button" type="button" onClick={onOpenLogin} disabled={status === 'loading'}>
          {user ? 'Edit Profile' : 'Login'}
        </button>
      </div>
    </div>
  );
};

import { useAuth } from '../../context/authContext';
import { useWallet } from '../../context/walletContext';

export const UserPanel = () => {
  const { user } = useAuth();
  const { role: walletRole } = useWallet();

  return (
    <div className="wallet-panel">
      <div className="wallet-meta">
        <p className="wallet-title">Your Role</p>
        {user && <p className="wallet-text">{user.email}</p>}
        <p className="wallet-role"><strong>{walletRole}</strong></p>
      </div>

    </div>
  );
};

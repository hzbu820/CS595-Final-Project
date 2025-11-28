import { useEffect, useState, type FormEvent } from 'react';
import { useAuth, type FrontendRole } from '../../context/authContext';
import { useWallet } from '../../context/walletContext';
import { shortAddress } from '../../lib/ethereum';

const ROLE_OPTIONS: FrontendRole[] = ['Producer', 'Transporter', 'Retailer', 'Regulator', 'Viewer'];

export const LoginScreen = () => {
  const { user, status, error, login, logout, updateRole } = useAuth();
  const { account, role: walletRole, hasProvider, connect } = useWallet();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<FrontendRole>('Viewer');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
    if (user?.role) {
      setRole(user.role);
    }
  }, [user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await login({ email, password, role });
      setMessage('Signed in successfully.');
    } catch {
      /* error handled in context */
    }
  };

  const applyDemoUser = () => {
    setEmail('demo@trace.local');
    setPassword('password123');
    setRole('Transporter');
    setMessage('Loaded demo credentials. Click Login to continue.');
  };

  const onRoleChange = async (next: FrontendRole) => {
    setRole(next);
    if (user) {
      await updateRole(next);
      setMessage(`Updated role to ${next}.`);
    }
  };

  return (
    <div className="screen-card form">
      <h2>Account Login</h2>
      <p className="screen-description">
        Frontend users authenticate (Firebase or local fallback), pick their UX role, and optionally link the connected
        wallet for on-chain actions. Use the same email/password to rehydrate your role across sessions.
      </p>

      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
        </label>
        <label>
          Role (UI scope)
          <select value={role} onChange={(e) => onRoleChange(e.target.value as FrontendRole)}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <div className="auth-actions">
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Working...' : user ? 'Update Profile' : 'Login'}
          </button>
          <button className="ghost-button" type="button" onClick={applyDemoUser}>
            Load Demo User
          </button>
          {user && (
            <button className="ghost-button" type="button" onClick={logout} disabled={status === 'loading'}>
              Sign Out
            </button>
          )}
        </div>
      </form>

      <div className="callout">
        <p>Wallet detected: {hasProvider ? shortAddress(account) || 'Not connected' : 'MetaMask required'}</p>
        {!account && hasProvider && (
          <button className="primary" type="button" onClick={connect}>
            Connect Wallet
          </button>
        )}
        <p>On-chain role: {walletRole}</p>
        <p>Frontend role: {user?.role ?? 'Viewer'}</p>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

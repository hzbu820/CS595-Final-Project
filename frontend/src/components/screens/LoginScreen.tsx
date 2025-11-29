import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/authContext';
import { useWallet } from '../../context/walletContext';
import { shortAddress } from '../../lib/ethereum';
import { linkEmailToWallet } from '../../lib/api';

export const LoginScreen = () => {
  const { user, status, error, login, logout } = useAuth();
  const { account, role: walletRole, hasProvider, connect, provider } = useWallet();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    try {
      await login({ email });
      setMessage('Profile saved locally. On-chain role is enforced by the contract.');
    } catch {
      /* error handled in context */
    }
  };

  const onLinkEmail = async () => {
    if (!account || !provider) {
      setMessage('Connect wallet before linking email.');
      return;
    }
    if (!email) {
      setMessage('Enter an email to link.');
      return;
    }
    setLinking(true);
    setMessage(null);
    try {
      const normalizedAddress = account.toLowerCase();
      const messageToSign = `Link email ${email} to ${normalizedAddress} for FoodTrace`;
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(messageToSign);
      await linkEmailToWallet({ address: normalizedAddress, email, signature });
      setMessage('Email linked to wallet via backend.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(`Link failed: ${msg}`);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="screen-card form">
      <h2>Account Login</h2>
      <p className="screen-description">
        Link your wallet for on-chain actions. Email is optional and stored locally/back-end for profile/notifications;
        the contract role is authoritative for access.
      </p>

      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
        </label>

        <div className="auth-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={onLinkEmail}
            disabled={linking || !account || status === 'loading'}
          >
            {linking ? 'Linking…' : 'Link Email to Wallet'}
          </button>
        </div>

        <div className="auth-actions">
          <button className="primary" type="submit" disabled={status === 'loading'}>
            {status === 'loading' ? 'Working...' : user ? 'Update Profile' : 'Save Profile'}
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
        <p>Frontend profile email: {user?.email ?? 'Not set'}</p>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

import { useWallet } from '../../context/walletContext';
import { shortAddress } from '../../lib/ethereum';

export const WalletPanel = () => {
  const {
    hasProvider,
    account,
    role,
    chainId,
    status,
    error,
    needsNetworkSwitch,
    connect,
    switchToTargetChain,
  } = useWallet();

  if (!hasProvider) {
    return (
      <div className="wallet-panel">
        <p className="wallet-title">Wallet</p>
        <p className="wallet-text">MetaMask is required to use this demo.</p>
        <a
          className="ghost-button"
          href="https://metamask.io/download/"
          target="_blank"
          rel="noreferrer"
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  return (
    <div className="wallet-panel">
      <div className="wallet-meta">
        <p className="wallet-title">Wallet</p>
        <p className="wallet-text">{account ? shortAddress(account) : 'Not connected'}</p>
        <p className="wallet-role">Role: {role}</p>
        <p className="wallet-network">Network: {chainId ?? '--'}</p>
      </div>

      {error && <p className="wallet-error">{error}</p>}

      <div className="wallet-actions">
        {!account && (
          <button className="primary" onClick={connect} disabled={status !== 'idle'}>
            {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}

        {account && needsNetworkSwitch && (
          <button
            className="primary"
            onClick={switchToTargetChain}
            disabled={status === 'switching'}
          >
            {status === 'switching' ? 'Switching...' : 'Switch to Sepolia'}
          </button>
        )}

        {account && !needsNetworkSwitch && (
          <span className="wallet-hint">Ready</span>
        )}
      </div>
    </div>
  );
};

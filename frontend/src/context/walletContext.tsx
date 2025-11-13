import { BrowserProvider, Contract } from 'ethers';
import {
  FOOD_TRACE_ADDRESS,
  TARGET_CHAIN_HEX,
  buildFoodTraceContract,
  createBrowserProvider,
  getEthereum,
  hasEthereum,
  isTargetChain,
  sepoliaChainConfig,
} from '../lib/ethereum';
import { getRoleLabel } from '../abi/foodTrace';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type WalletStatus = 'idle' | 'connecting' | 'switching';

interface WalletContextValue {
  hasProvider: boolean;
  provider: BrowserProvider | null;
  contract: Contract | null;
  account?: string;
  chainId?: number;
  role: string;
  status: WalletStatus;
  error?: string | null;
  needsNetworkSwitch: boolean;
  connect: () => Promise<void>;
  switchToTargetChain: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [account, setAccount] = useState<string>();
  const [chainId, setChainId] = useState<number>();
  const [role, setRole] = useState<string>(getRoleLabel(0));
  const [needsNetworkSwitch, setNeedsNetworkSwitch] = useState(false);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState<boolean>(hasEthereum());

  const resetState = useCallback(() => {
    setContract(null);
    setRole(getRoleLabel(0));
  }, []);

  const hydrateRole = useCallback(
    async (nextContract: Contract, walletAddress: string) => {
      try {
        const roleValue = await nextContract.roles(walletAddress);
        setRole(getRoleLabel(roleValue));
      } catch (err) {
        console.error('Failed to fetch role', err);
      }
    },
    [],
  );

  const connect = useCallback(async () => {
    if (!hasEthereum()) {
      setHasProvider(false);
      setError('MetaMask not detected');
      return;
    }

    setHasProvider(true);
    setStatus('connecting');
    setError(null);

    try {
      const browserProvider = createBrowserProvider();
      setProvider(browserProvider);
      const accounts = (await browserProvider.send('eth_requestAccounts', [])) as string[];
      if (!accounts.length) {
        throw new Error('No accounts returned from MetaMask');
      }
      const selectedAccount = accounts[0];
      setAccount(selectedAccount);

      const network = await browserProvider.getNetwork();
      const numericChainId = Number(network.chainId);
      setChainId(numericChainId);

      if (!isTargetChain(network.chainId)) {
        setNeedsNetworkSwitch(true);
        resetState();
        return;
      }

      setNeedsNetworkSwitch(false);

      if (!FOOD_TRACE_ADDRESS) {
        throw new Error('Missing VITE_CONTRACT_ADDRESS');
      }

      const signer = await browserProvider.getSigner();
      const nextContract = buildFoodTraceContract(signer);
      setContract(nextContract);
      await hydrateRole(nextContract, selectedAccount);
    } catch (err) {
      resetState();
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error(err);
    } finally {
      setStatus('idle');
    }
  }, [hydrateRole, resetState]);

  const switchToTargetChain = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setError('MetaMask not detected');
      return;
    }

    setStatus('switching');
    setError(null);

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_HEX }],
      });
      setNeedsNetworkSwitch(false);
      await connect();
    } catch (err: any) {
      if (err?.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [sepoliaChainConfig],
        });
        await connect();
      } else {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      }
    } finally {
      setStatus('idle');
    }
  }, [connect]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (!accounts.length) {
        setAccount(undefined);
        resetState();
        return;
      }
      setAccount(accounts[0]);
      connect();
    };

    const handleChainChanged = () => {
      connect();
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [connect, resetState]);

  const value = useMemo<WalletContextValue>(() => ({
    hasProvider,
    provider,
    contract,
    account,
    chainId,
    role,
    status,
    error,
    needsNetworkSwitch,
    connect,
    switchToTargetChain,
  }), [
    hasProvider,
    provider,
    contract,
    account,
    chainId,
    role,
    status,
    error,
    needsNetworkSwitch,
    connect,
    switchToTargetChain,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

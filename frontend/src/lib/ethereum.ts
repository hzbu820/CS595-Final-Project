import {
  BrowserProvider,
  Contract,
  JsonRpcSigner,
  type ContractTransactionResponse,
  type TransactionReceipt,
} from 'ethers';
import { foodTraceAbi } from '../abi/foodTrace';

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, cb: (...params: any[]) => void) => void;
  removeListener?: (event: string, cb: (...params: any[]) => void) => void;
};

export const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? '11155111');
export const TARGET_CHAIN_HEX = `0x${TARGET_CHAIN_ID.toString(16)}`;
export const FOOD_TRACE_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS ?? '';

export const getEthereum = (): EthereumProvider | undefined => {
  if (typeof window === 'undefined') return undefined;
  return (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
};

export const hasEthereum = () => Boolean(getEthereum());

export const createBrowserProvider = () => {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new Error('MetaMask is not available');
  }
  return new BrowserProvider(ethereum as never);
};

export const buildFoodTraceContract = (signerOrProvider: BrowserProvider | JsonRpcSigner) => {
  if (!FOOD_TRACE_ADDRESS) {
    throw new Error('Contract address missing. Set VITE_CONTRACT_ADDRESS.');
  }
  return new Contract(FOOD_TRACE_ADDRESS, foodTraceAbi, signerOrProvider);
};

export type TxMetrics = {
  txHash: string;
  latencyMs: number;
  gasUsed?: string;
};

export type TxWithMetrics = {
  receipt: TransactionReceipt;
  metrics: TxMetrics;
};

export const waitForTxWithMetrics = async (
  tx: ContractTransactionResponse,
  label?: string,
): Promise<TxWithMetrics> => {
  const startedAt = Date.now();
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('Transaction was dropped or not mined');
  }

  const finishedAt = Date.now();
  const latencyMs = finishedAt - startedAt;
  const gasUsed = receipt.gasUsed ? receipt.gasUsed.toString() : undefined;

  const prefix = label ? `[tx:${label}]` : '[tx]';
  console.log(
    `${prefix} hash=${receipt.hash} latencyMs=${latencyMs}` +
      (gasUsed ? ` gasUsed=${gasUsed}` : ''),
  );

  return {
    receipt,
    metrics: {
      txHash: receipt.hash,
      latencyMs,
      gasUsed,
    },
  };
};


export const shortAddress = (address?: string, chars = 4) => {
  if (!address) return '--';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

export const isTargetChain = (chainId?: number | bigint) => {
  if (chainId === undefined) return false;
  return Number(chainId) === TARGET_CHAIN_ID;
};

export const sepoliaChainConfig = {
  chainId: TARGET_CHAIN_HEX,
  chainName: 'Sepolia Testnet',
  nativeCurrency: {
    name: 'SepoliaETH',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};

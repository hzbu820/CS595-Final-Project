import './App.css';
import { WalletProvider } from './context/walletContext';
import { AppLayout } from './components/layout/AppLayout';

const App = () => (
  <WalletProvider>
    <AppLayout />
  </WalletProvider>
);

export default App;

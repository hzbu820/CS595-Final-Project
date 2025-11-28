import './App.css';
import { WalletProvider } from './context/walletContext';
import { AuthProvider } from './context/authContext';
import { AppLayout } from './components/layout/AppLayout';

const App = () => (
  <AuthProvider>
    <WalletProvider>
      <AppLayout />
    </WalletProvider>
  </AuthProvider>
);

export default App;

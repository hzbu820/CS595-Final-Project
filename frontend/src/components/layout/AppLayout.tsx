import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { WalletPanel } from './WalletPanel';
import { TabNavigation } from './TabNavigation';
import { CreateBatchScreen } from '../screens/CreateBatchScreen';
import { AppendEventScreen } from '../screens/AppendEventScreen';
import { TransferCustodyScreen } from '../screens/TransferCustodyScreen';
import { RecallScreen } from '../screens/RecallScreen';
import { VerifyScreen } from '../screens/VerifyScreen';
import { ViewerScreen } from '../screens/ViewerScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { QrHubScreen } from '../screens/QrHubScreen';
import { UserPanel } from './UserPanel';
import { InspectorScreen } from '../screens/InspectorScreen';
import { useAuth, type FrontendRole } from '../../context/authContext';
import { useWallet } from '../../context/walletContext';

type TabConfig = {
  id: string;
  label: string;
  description?: string;
  roles: FrontendRole[];
  component: ReactNode;
};

const tabs: TabConfig[] = [
  { id: 'login', label: 'Login / Profile', roles: ['Unregistered', 'Viewer', 'Producer', 'Transporter', 'Retailer', 'Regulator'], component: <LoginScreen /> },
  { id: 'create', label: 'Create Batch', roles: ['Producer'], component: <CreateBatchScreen /> },
  { id: 'append', label: 'Append Event', roles: ['Producer', 'Transporter', 'Retailer', 'Regulator'], component: <AppendEventScreen /> },
  { id: 'transfer', label: 'Transfer Custody', roles: ['Producer', 'Transporter', 'Retailer'], component: <TransferCustodyScreen /> },
  { id: 'recall', label: 'Recall', roles: ['Regulator'], component: <RecallScreen /> },
  { id: 'inspect', label: 'Inspector', roles: ['Regulator'], component: <InspectorScreen /> },
  { id: 'verify', label: 'Verify Hashes', roles: ['Producer', 'Transporter', 'Retailer', 'Regulator', 'Viewer', 'Unregistered'], component: <VerifyScreen /> },
  { id: 'viewer', label: 'Viewer', roles: ['Producer', 'Transporter', 'Retailer', 'Regulator', 'Viewer', 'Unregistered'], component: <ViewerScreen /> },
  { id: 'qr', label: 'QR Connect', roles: ['Producer', 'Transporter', 'Retailer', 'Regulator', 'Viewer', 'Unregistered'], component: <QrHubScreen /> },
];

export const AppLayout = () => {
  const { effectiveRole, user } = useAuth();
  const { role: walletRole } = useWallet();
  const [activeTab, setActiveTab] = useState<string>('login');

  const roleSet = useMemo(() => {
    const set = new Set<FrontendRole>();
    set.add((walletRole as FrontendRole) ?? 'Unregistered');
    set.add(effectiveRole);
    if (user) set.add('Viewer');
    return set;
  }, [effectiveRole, walletRole, user]);

  const allowedTabs = useMemo(
    () => tabs.filter((tab) => tab.roles.some((role) => roleSet.has(role))),
    [roleSet],
  );

  useEffect(() => {
    if (allowedTabs.length === 0) return;
    if (!allowedTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [activeTab, allowedTabs]);

  const activeComponent = useMemo(() => {
    const found = allowedTabs.find((tab) => tab.id === activeTab);
    return found?.component ?? allowedTabs[0]?.component ?? null;
  }, [activeTab, allowedTabs]);

  const openLoginTab = () => {
    setActiveTab('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="project-meta">
          <p className="eyebrow">CS595 • Blockchain-Based Food Traceability</p>
          <h1>Supply Chain Transparency Portal</h1>
          <p className="subtitle">
            Role-aware dashboard for producers, logistics partners, regulators, and public consumers to
            trace every batch from farm to shelf.
          </p>
        </div>
        <div className="panel-stack">
          <WalletPanel />
          <UserPanel onOpenLogin={openLoginTab} />
        </div>
      </header>

      <TabNavigation tabs={allowedTabs} activeTab={activeTab} onChange={setActiveTab} />

      <section className="screen-container">{activeComponent}</section>
    </div>
  );
};

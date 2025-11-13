import { useMemo, useState } from 'react';
import { WalletPanel } from './WalletPanel';
import { TabNavigation } from './TabNavigation';
import { CreateBatchScreen } from '../screens/CreateBatchScreen';
import { AppendEventScreen } from '../screens/AppendEventScreen';
import { TransferCustodyScreen } from '../screens/TransferCustodyScreen';
import { RecallScreen } from '../screens/RecallScreen';
import { VerifyScreen } from '../screens/VerifyScreen';
import { ViewerScreen } from '../screens/ViewerScreen';

const tabs = [
  { id: 'create', label: 'Create Batch', component: <CreateBatchScreen /> },
  { id: 'append', label: 'Append Event', component: <AppendEventScreen /> },
  { id: 'transfer', label: 'Transfer Custody', component: <TransferCustodyScreen /> },
  { id: 'recall', label: 'Recall', component: <RecallScreen /> },
  { id: 'verify', label: 'Verify File', component: <VerifyScreen /> },
  { id: 'viewer', label: 'Viewer', component: <ViewerScreen /> },
];

export const AppLayout = () => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const activeComponent = useMemo(() => {
    const found = tabs.find((tab) => tab.id === activeTab);
    return found?.component ?? tabs[0].component;
  }, [activeTab]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="project-meta">
          <p className="eyebrow">CS595 · Blockchain-Based Food Traceability</p>
          <h1>Supply Chain Transparency Portal</h1>
          <p className="subtitle">
            Role-aware dashboard for producers, logistics partners, regulators, and public consumers to
            trace every batch from farm to shelf.
          </p>
        </div>
        <WalletPanel />
      </header>

      <TabNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <section className="screen-container">{activeComponent}</section>
    </div>
  );
};

type TabItem = {
  id: string;
  label: string;
  description?: string;
};

interface Props {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const TabNavigation = ({ tabs, activeTab, onChange }: Props) => (
  <div className="tab-nav">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        className={tab.id === activeTab ? 'tab-button active' : 'tab-button'}
        onClick={() => onChange(tab.id)}
        type="button"
      >
        <span>{tab.label}</span>
        {tab.description && <small>{tab.description}</small>}
      </button>
    ))}
  </div>
);

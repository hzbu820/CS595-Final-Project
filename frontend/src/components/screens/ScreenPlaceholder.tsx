interface Props {
  title: string;
  description: string;
  tips?: string;
}

export const ScreenPlaceholder = ({ title, description, tips }: Props) => (
  <div className="screen-card">
    <h2>{title}</h2>
    <p className="screen-description">{description}</p>
    {tips && <p className="screen-tips">{tips}</p>}
    <p className="screen-coming-soon">Detailed form coming up next.</p>
  </div>
);

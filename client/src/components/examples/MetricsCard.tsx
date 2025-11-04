import MetricsCard from '../MetricsCard';
import { Globe, CheckCircle, FileText } from 'lucide-react';

export default function MetricsCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-3 p-6">
      <MetricsCard
        title="Active Websites"
        value={5}
        icon={Globe}
        trend={{ value: 20, isPositive: true }}
      />
      <MetricsCard
        title="Pending Approvals"
        value={12}
        icon={CheckCircle}
        trend={{ value: 8, isPositive: false }}
      />
      <MetricsCard
        title="Published This Month"
        value={47}
        icon={FileText}
        trend={{ value: 35, isPositive: true }}
      />
    </div>
  );
}

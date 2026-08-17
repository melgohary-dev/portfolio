import { AnalyticsView } from '@/components/analytics-view';
import { getT } from '@/lib/server-i18n';

export default async function AnalyticsPage() {
  const t = await getT();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t('analytics.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('analytics.subtitle')}</p>
      </div>
      <AnalyticsView />
    </div>
  );
}

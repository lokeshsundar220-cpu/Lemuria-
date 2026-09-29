import React from 'react';

interface ReportsPageProps {
  tasks: {
    department: string;
    status: string;
    declined: string[];
  }[];
  emergencies: {
    id: string;
  }[];
  staffList: {
    department: string;
    enabled: string;
  }[];
  feedbacks: {
    serviceType: string;
    rating: number;
  }[];
  deptMap: Record<string, string>;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  tasks,
  emergencies,
  staffList,
  feedbacks,
  deptMap
}) => {
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const declinedOffersCount = tasks.reduce((a, t) => a + (t.declined ? t.declined.length : 0), 0);

  const activeDepts = Object.keys(deptMap).filter((d) => d !== 'manager');

  return (
    <>
      <h1 className="serif" style={{ marginBottom: '16px' }}>
        Executive Operations Report
      </h1>
      <div className="grid g4" style={{ marginBottom: '18px' }}>
        <div className="card met" style={{ '--k': 'var(--bl)' } as React.CSSProperties}>
          <b>{tasks.length}</b>
          <span>Total Tasks Created</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--g)' } as React.CSSProperties}>
          <b>{completedCount}</b>
          <span>Tasks Completed</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--o)' } as React.CSSProperties}>
          <b>{declinedOffersCount}</b>
          <span>Declined Offers</span>
        </div>
        <div className="card met" style={{ '--k': 'var(--r)' } as React.CSSProperties}>
          <b>{emergencies.length}</b>
          <span>Emergency Alerts</span>
        </div>
      </div>

      <div className="card">
        <h2>Department Performance Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th>Total Tasks</th>
              <th>Completed</th>
              <th>Active Staff</th>
              <th>Avg Feedback</th>
            </tr>
          </thead>
          <tbody>
            {activeDepts.map((d) => {
              const dTasks = tasks.filter((t) => t.department === d);
              const dStaff = staffList.filter((s) => s.department === d && s.enabled === 'ENABLED');
              const dFb = feedbacks.filter((f) => f.serviceType === d);
              const dAvg = dFb.length
                ? (dFb.reduce((a, b) => a + b.rating, 0) / dFb.length).toFixed(1) + ' ★'
                : '—';

              return (
                <tr key={d}>
                  <td>
                    <b>{deptMap[d]}</b>
                  </td>
                  <td>{dTasks.length}</td>
                  <td>{dTasks.filter((t) => t.status === 'COMPLETED').length}</td>
                  <td>{dStaff.length} active</td>
                  <td>
                    <span className="gold">{dAvg}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

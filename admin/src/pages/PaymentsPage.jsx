import { useState } from 'react';
import ResourcePage from '../components/ResourcePage.jsx';
import PaymentSchedule from '../components/PaymentSchedule.jsx';
import { RESOURCES } from '../resources.js';

// Payments module = the standard CRUD table + a supplier payment-schedule
// generator (enter a total once, define % installments, auto-create entries).
export default function PaymentsPage() {
  const [k, setK] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <PaymentSchedule onSaved={() => setK((v) => v + 1)} />
      </div>
      <ResourcePage key={k} config={RESOURCES.payments} />
    </div>
  );
}

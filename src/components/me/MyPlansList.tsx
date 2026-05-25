// Surface 7 plan list — RSC. Responsive grid: 1-col mobile, 2-col md, 3-col lg.
//
// The "active" plan treatment (border-l-4 border-emerald-700) lights up on the
// owner + most-recently-updated plan per UI-SPEC §Surface 7 active state.

import type { MyPlansRow } from '@/lib/db/queries/my-plans';
import { PlanCard } from './PlanCard';

export interface MyPlansListProps {
  plans: ReadonlyArray<MyPlansRow>;
  locale: string;
}

export function MyPlansList({ plans, locale }: MyPlansListProps) {
  // Active = the owner + most-recently-updated plan. The list is already
  // sorted by updated_at DESC, so the first owner-plan is the candidate.
  const activeId = plans.find((p) => p.isOwner)?.id ?? null;

  return (
    <ul className="space-y-3 px-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:mx-auto lg:max-w-[1024px] lg:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          locale={locale}
          isActive={plan.id === activeId}
        />
      ))}
    </ul>
  );
}

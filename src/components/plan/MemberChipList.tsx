// Surface 3 member chip list — first 8 chips, "+N más" overflow.
// RSC. Display name resolved at render (D-21).

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getTranslations } from 'next-intl/server';

export interface MemberDisplay {
  user_id: string;
  display_name: string; // resolved at render from auth.users.user_metadata
}

export interface MemberChipListProps {
  members: ReadonlyArray<MemberDisplay>;
}

const MAX_VISIBLE = 8;

function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? '';
}

function initial(name: string): string {
  const fn = firstName(name);
  return fn.charAt(0).toUpperCase() || '?';
}

export async function MemberChipList({ members }: MemberChipListProps) {
  const t = await getTranslations();
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - visible.length;
  return (
    <section
      className="px-4 pt-6"
      aria-label={t('plan.view.members_section', { count: members.length })}
    >
      <h2 className="text-sm font-semibold text-zinc-950">
        {t('plan.view.members_section', { count: members.length })}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {visible.map((m) => (
          <li
            key={m.user_id}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-950"
            aria-label={t('plan.view.member_chip_aria', { name: m.display_name })}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initial(m.display_name)}</AvatarFallback>
            </Avatar>
            <span>{firstName(m.display_name)}</span>
          </li>
        ))}
        {overflow > 0 ? (
          <li className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-600">
            {t('plan.view.members_overflow', { count: overflow })}
          </li>
        ) : null}
      </ul>
    </section>
  );
}

'use client';

// Header user menu — avatar + dropdown for authenticated users (D-14).
// Rendered inside PlanHeader (RSC) as a client island so the dropdown's
// interactive state lives in the browser. The avatar contents (initials) and
// owner-only "Configuración del plan" link are passed in as props from the
// server-rendered shell.

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getBrowserClient } from '@/lib/supabase/browser';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export interface HeaderUserMenuProps {
  initials: string;
  isOwner: boolean;
  planSettingsHref?: string;
}

export function HeaderUserMenu({ initials, isOwner, planSettingsHref }: HeaderUserMenuProps) {
  const t = useTranslations();
  const router = useRouter();

  async function handleSignOut(): Promise<void> {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.replace('/');
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('nav.my_plans')}
        className="inline-flex h-11 items-center gap-1 rounded-full p-1 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-zinc-600" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          onClick={() => {
            router.push('/me');
          }}
        >
          {t('nav.my_plans')}
        </DropdownMenuItem>
        {isOwner && planSettingsHref ? (
          <DropdownMenuItem
            onClick={() => {
              router.push(planSettingsHref);
            }}
          >
            {t('nav.plan_settings')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>{t('nav.sign_out')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

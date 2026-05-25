'use client';

// Header user menu — avatar + dropdown for authenticated users (D-14).
// Rendered inside PlanHeader (RSC) as a client island so the dropdown's
// interactive state lives in the browser. The avatar contents (initials) and
// owner-only "Configuración del plan" link are passed in as props from the
// server-rendered shell.
//
// Plan 01-05 update: sign-out goes through the POST-only /auth/sign-out route
// via a hidden <form> + submit, so a malicious image src or pre-fetched link
// cannot drive the user off (T-05-02 — CSRF mitigation).

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export interface HeaderUserMenuProps {
  initials: string;
  isOwner: boolean;
  planSettingsHref?: string;
}

export function HeaderUserMenu({ initials, isOwner, planSettingsHref }: HeaderUserMenuProps) {
  const t = useTranslations();
  const router = useRouter();
  const signOutFormRef = useRef<HTMLFormElement>(null);

  return (
    <>
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
          <DropdownMenuItem
            onClick={() => {
              // Submit the hidden POST form — drives the user through
              // /auth/sign-out which clears the SSR cookie + 303s to /.
              signOutFormRef.current?.submit();
            }}
          >
            {t('nav.sign_out')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={signOutFormRef} action="/auth/sign-out" method="post" className="hidden" />
    </>
  );
}

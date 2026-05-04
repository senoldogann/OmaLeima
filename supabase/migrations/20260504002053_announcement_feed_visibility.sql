create or replace function public.can_read_announcement(target_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $can_read_announcement$
  select exists (
    select 1
    from public.announcements a
    where a.id = target_announcement_id
      and (
        public.is_platform_admin()
        or (
          a.status = 'PUBLISHED'
          and a.starts_at <= now()
          and (a.ends_at is null or a.ends_at > now())
          and (
            a.audience = 'ALL'
            or (
              a.audience = 'STUDENTS'
              and exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                  and p.primary_role = 'STUDENT'
                  and p.status = 'ACTIVE'
              )
            )
            or (
              a.audience = 'BUSINESSES'
              and exists (
                select 1
                from public.business_staff bs
                where bs.user_id = auth.uid()
                  and bs.status = 'ACTIVE'
              )
            )
            or (
              a.audience = 'CLUBS'
              and (
                (a.club_id is null and exists (
                  select 1
                  from public.club_members cm
                  where cm.user_id = auth.uid()
                    and cm.status = 'ACTIVE'
                ))
                or (a.club_id is not null and public.is_club_staff_for(a.club_id))
              )
            )
          )
        )
        or (a.club_id is not null and public.is_club_staff_for(a.club_id))
      )
  );
$can_read_announcement$;

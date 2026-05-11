alter table episodes
  drop constraint if exists episodes_status_check;

alter table episodes
  add constraint episodes_status_check check (
    status in (
      'draft',
      'rough_cut',
      'ready_for_review',
      'submitted',
      'needs_changes',
      'approved',
      'scheduled',
      'published'
    )
  );

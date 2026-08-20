drop policy if exists "media_admin_insert" on storage.objects;
drop policy if exists "media_admin_delete" on storage.objects;

create policy "media_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and public.has_role(auth.uid(), 'admin')
  and (storage.foldername(name))[1] = 'blog'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "media_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and public.has_role(auth.uid(), 'admin')
  and (storage.foldername(name))[1] = 'blog'
  and (storage.foldername(name))[2] = auth.uid()::text
);

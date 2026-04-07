-- Create a storage bucket for project documents (PDF, Word, Excel, etc.)
insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', true);

-- RLS policies for the documents bucket
create policy "Documents are readable by everyone"
on storage.objects for select
using ( bucket_id = 'project-documents' );

create policy "Users can upload their own documents"
on storage.objects for insert
with check ( bucket_id = 'project-documents' and auth.uid() = owner );

create policy "Users can update their own documents"
on storage.objects for update
using ( bucket_id = 'project-documents' and auth.uid() = owner );

create policy "Users can delete their own documents"
on storage.objects for delete
using ( bucket_id = 'project-documents' and auth.uid() = owner );

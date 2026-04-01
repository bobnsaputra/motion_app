-- Create a new storage bucket called 'project-audio' for storing keyframe sound effects
insert into storage.buckets (id, name, public)
values ('project-audio', 'project-audio', true);

-- Enable RLS on the new bucket
create policy "Audio files are readable by everyone"
on storage.objects for select
using ( bucket_id = 'project-audio' );

create policy "Users can upload their own audio files"
on storage.objects for insert
with check ( bucket_id = 'project-audio' and auth.uid() = owner );

create policy "Users can update their own audio files"
on storage.objects for update
using ( bucket_id = 'project-audio' and auth.uid() = owner );

create policy "Users can delete their own audio files"
on storage.objects for delete
using ( bucket_id = 'project-audio' and auth.uid() = owner );

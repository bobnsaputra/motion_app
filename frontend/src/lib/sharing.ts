import { supabase } from './supabase'

export type ShareRow = {
  id: string
  project_id: string
  owner_id: string
  shared_with_email: string
  shared_with_id: string | null
  permission: 'view' | 'edit'
  created_at: string
}

export type SharedProjectSummary = {
  id: string
  title: string
  updated_at: string
  owner_email: string
  permission: 'view' | 'edit'
}

/** List all shares for a project (owner view) */
export async function listProjectShares(projectId: string): Promise<ShareRow[]> {
  const { data, error } = await supabase
    .from('project_shares')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** List projects shared with the current user */
export async function listSharedProjects(): Promise<SharedProjectSummary[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Step 1: Get share rows by email (no join — avoids cross-table RLS issues)
  const { data: shares, error: sharesErr } = await supabase
    .from('project_shares')
    .select('project_id, permission, owner_id')
    .eq('shared_with_email', user.email!)
    .order('created_at', { ascending: false })

  if (sharesErr) throw sharesErr
  if (!shares || shares.length === 0) return []

  // Step 2: Fetch the projects separately by their IDs
  const projectIds = [...new Set(shares.map((s: any) => s.project_id))]
  const { data: projects, error: projErr } = await supabase
    .from('projects')
    .select('id, title, updated_at')
    .in('id', projectIds)

  if (projErr) throw projErr
  const projectMap: Record<string, any> = {}
  for (const p of projects ?? []) projectMap[p.id] = p

  // Step 3: Look up owner emails
  const ownerIds = [...new Set(shares.map((r: any) => r.owner_id))]
  const ownerMap: Record<string, string> = {}
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', ownerIds)
    for (const p of profiles ?? []) ownerMap[p.id] = p.email
  }

  return shares
    .filter((row: any) => projectMap[row.project_id])
    .map((row: any) => ({
      id: projectMap[row.project_id].id,
      title: projectMap[row.project_id].title,
      updated_at: projectMap[row.project_id].updated_at,
      owner_email: ownerMap[row.owner_id] ?? 'Unknown',
      permission: row.permission,
    }))
}

/** Share a project with a user by email */
export async function shareProject(
  projectId: string,
  email: string,
  permission: 'view' | 'edit' = 'view'
): Promise<ShareRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const trimmed = email.toLowerCase().trim()
  if (trimmed === user.email?.toLowerCase()) {
    throw new Error('You cannot share a project with yourself')
  }

  // Check if the email belongs to an existing user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  const { data, error } = await supabase
    .from('project_shares')
    .upsert(
      {
        project_id: projectId,
        owner_id: user.id,
        shared_with_email: email.toLowerCase().trim(),
        shared_with_id: profile?.id ?? null,
        permission,
      },
      { onConflict: 'project_id,shared_with_email' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/** Update share permission */
export async function updateSharePermission(
  shareId: string,
  permission: 'view' | 'edit'
): Promise<void> {
  const { error } = await supabase
    .from('project_shares')
    .update({ permission })
    .eq('id', shareId)

  if (error) throw error
}

/** Revoke a share */
export async function revokeShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('project_shares')
    .delete()
    .eq('id', shareId)

  if (error) throw error
}

/** Get the current user's permission for a specific project (null if not shared with them) */
export async function getMyPermission(projectId: string): Promise<'view' | 'edit' | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const { data, error } = await supabase
    .from('project_shares')
    .select('permission')
    .eq('project_id', projectId)
    .eq('shared_with_email', user.email)
    .maybeSingle()

  if (error || !data) return null
  return data.permission as 'view' | 'edit'
}

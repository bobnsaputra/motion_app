import { supabase } from './supabase'

export type ProjectSummary = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type ProjectRow = ProjectSummary & {
  user_id: string
  data: Record<string, unknown>
}

/** List all projects for the current user (metadata only, no data blob) */
export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/** Load a single project by id (includes full data blob) */
export async function loadProject(projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error) throw error
  return data
}

/** Create a new project via server-side RPC (enforces subscription limits). */
export async function createProject(title: string, projectData: Record<string, unknown>): Promise<ProjectRow> {
  const { data, error } = await supabase.rpc('create_project_if_allowed', {
    p_title: title,
    p_data: projectData,
  })

  if (error) {
    // Extract user-friendly message from the DB exception
    const msg = error.message || ''
    if (msg.includes('PROJECT_LIMIT_REACHED')) {
      throw new Error('PROJECT_LIMIT_REACHED')
    }
    if (msg.includes('TRIAL_EXPIRED')) {
      throw new Error('TRIAL_EXPIRED')
    }
    throw error
  }
  return data as ProjectRow
}

/** Update an existing project's data and/or title */
export async function updateProject(projectId: string, updates: { title?: string; data?: Record<string, unknown> }): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  return data
}

/** Delete a project */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error
}

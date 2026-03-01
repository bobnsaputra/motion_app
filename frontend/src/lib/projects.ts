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

/** Create a new project. Returns the created row. */
export async function createProject(title: string, projectData: Record<string, unknown>): Promise<ProjectRow> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, title, data: projectData })
    .select()
    .single()

  if (error) throw error
  return data
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

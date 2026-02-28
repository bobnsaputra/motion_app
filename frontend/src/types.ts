export type Character = {
  id: string
  name: string
  x: number
  y: number
  angle?: number
  eyeOffset?: number
  size?: number
  color?: string
  shoulderColor?: string
  visible?: boolean // per-keyframe visibility (default true)
}

export type Guide = {
  id: string
  orientation: 'v' | 'h'
  pos: number
  start: number
  end: number
}

export type User = {
  id: string
  username: string
  email: string
}

export type TextAnnotation = {
  id: string
  x: number
  y: number
  width: number
  height?: number // user-set minimum height (from corner resize); auto-computed if omitted
  text: string
  fontSize: number
  color: string
}

export type Keyframe = {
  id: number
  label: string
  characters: Character[] // snapshot of all characters at this keyframe, with per-keyframe visibility
  annotations?: TextAnnotation[] // text annotations on the canvas for this keyframe
  linkedTo?: number // optional index of another keyframe this one is linked to (follows that keyframe until edited)
  stageNotes?: { left: string; center: string; right: string } // director notes for left/center/right stage areas
}

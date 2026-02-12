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

export type Keyframe = {
  id: number
  label: string
  characters: Character[] // snapshot of all characters at this keyframe, with per-keyframe visibility
  linkedTo?: number // optional index of another keyframe this one is linked to (follows that keyframe until edited)
}

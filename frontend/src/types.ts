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
}

export type Guide = {
  id: string
  orientation: 'v' | 'h'
  pos: number
  start: number
  end: number
}

export type User = {
  id: number
  username: string
  email: string
}

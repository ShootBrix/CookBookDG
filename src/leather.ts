export type Leather = {
  name: string
  cover: string
  spine: string
}

export const LEATHERS: Leather[] = [
  { name: 'oxblood', cover: '#7A2E2A', spine: '#521E1B' },
  { name: 'wheat', cover: '#A87732', spine: '#7A5320' },
  { name: 'forest', cover: '#3A5A40', spine: '#27402C' },
  { name: 'ink blue', cover: '#33465E', spine: '#22303F' },
  { name: 'plum', cover: '#5B3A5E', spine: '#3F2741' },
  { name: 'clay', cover: '#8A5A2B', spine: '#63401D' },
]

export function leatherFor(index: number): Leather {
  return LEATHERS[index % LEATHERS.length]
}

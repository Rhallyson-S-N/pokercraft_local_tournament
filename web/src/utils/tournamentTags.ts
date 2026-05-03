/**
 * Utility to extract descriptive tags from tournament names
 */

export interface TournamentTag {
  label: string
  type: 'format' | 'speed' | 'variant' | 'special'
}

export function getTournamentTags(name: string): TournamentTag[] {
  const tags: TournamentTag[] = []
  const lowerName = name.toLowerCase()

  // Format
  if (lowerName.includes('bounty') || lowerName.includes('progressive') || lowerName.includes('pko')) {
    tags.push({ label: 'Bounty', type: 'format' })
  }
  if (lowerName.includes('satellite') || lowerName.includes('sat')) {
    tags.push({ label: 'Satellite', type: 'format' })
  }
  if (lowerName.includes('freeroll')) {
    tags.push({ label: 'Freeroll', type: 'format' })
  }

  // Speed
  if (lowerName.includes('turbo')) {
    tags.push({ label: 'Turbo', type: 'speed' })
  }
  if (lowerName.includes('hyper')) {
    tags.push({ label: 'Hyper', type: 'speed' })
  }

  // Variant
  if (lowerName.includes('omaha') || lowerName.includes('omaholic')) {
    tags.push({ label: 'Omaha', type: 'variant' })
  }
  if (lowerName.includes('short deck') || lowerName.includes('6+')) {
    tags.push({ label: '6+', type: 'variant' })
  }

  // Special
  if (lowerName.includes('zodiac')) {
    tags.push({ label: 'Zodiac', type: 'special' })
  }
  if (lowerName.includes('deepstack') || lowerName.includes('deep')) {
    tags.push({ label: 'Deepstack', type: 'special' })
  }

  return tags
}

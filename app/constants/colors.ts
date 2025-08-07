export const MEMBER_COLORS = [
  '#EF4444', // Red
  '#10B981', // Green  
  '#A855F7', // Purple
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#F97316', // Orange
]

export const getMemberColor = (index: number): string => {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

export const LABEL_COLORS = {
  DEFAULT: {
    top: 'rgba(251, 207, 232, 0.95)', // Pink
    bottom: 'rgba(167, 243, 208, 0.95)', // Green
    left: 'rgba(221, 214, 254, 0.95)', // Purple
    right: 'rgba(253, 230, 138, 0.95)' // Yellow
  }
}

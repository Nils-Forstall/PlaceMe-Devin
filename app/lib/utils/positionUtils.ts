import { Position } from '../../types'
import { UI_CONSTANTS } from '../../constants/ui'

export const calculateInitialPositions = (memberCount: number): Position[] => {
  const positions: Position[] = []
  
  for (let i = 0; i < memberCount; i++) {
    const angle = (i * 2 * Math.PI) / memberCount
    const radius = UI_CONSTANTS.INITIAL_POSITION.RADIUS
    const centerX = UI_CONSTANTS.INITIAL_POSITION.CIRCLE_CENTER_X
    const centerY = UI_CONSTANTS.INITIAL_POSITION.CIRCLE_CENTER_Y
    
    const x = Math.max(
      UI_CONSTANTS.POSITION_BOUNDS.MIN, 
      Math.min(
        UI_CONSTANTS.POSITION_BOUNDS.MAX, 
        centerX + Math.cos(angle) * radius
      )
    )
    const y = Math.max(
      UI_CONSTANTS.POSITION_BOUNDS.MIN, 
      Math.min(
        UI_CONSTANTS.POSITION_BOUNDS.MAX, 
        centerY + Math.sin(angle) * radius
      )
    )
    
    positions.push({ x, y })
  }
  
  return positions
}

export const normalizePosition = (position: Position): Position => {
  return {
    x: Math.max(0, Math.min(position.x, 1)),
    y: Math.max(0, Math.min(position.y, 1))
  }
}

export const convertToPercentage = (position: Position): Position => {
  return {
    x: position.x * 100,
    y: position.y * 100
  }
}

export const convertFromPercentage = (position: Position): Position => {
  return {
    x: position.x / 100,
    y: position.y / 100
  }
}

import { useState, useRef } from 'react'
import { useDraggable, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core'

interface Position {
  x: number
  y: number
}

interface TokenPositions {
  [tokenId: string]: Position
}

interface DragAndDropState {
  positions: TokenPositions
  activeId: string | null
  gridRef: React.RefObject<HTMLDivElement>
  sensors: ReturnType<typeof useSensors>
  handleDragStart: (event: any) => void
  handleDragEnd: (event: any) => void
  handleDragCancel: () => void
  updatePosition: (tokenId: string, position: Position) => void
}

const GRID_SIZE = 300
const TOKEN_SIZE = 35

export function useDragAndDrop(initialPositions: TokenPositions): DragAndDropState {
  const [positions, setPositions] = useState<TokenPositions>(initialPositions)
  const [activeId, setActiveId] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>

  // Configure sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  )

  // Handle drag start
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  // Handle drag end
  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (gridRef.current) {
      // Get the grid container (the white background div)
      const gridContainer = gridRef.current.querySelector('div[style*="background-color: white"]')
   
      if (gridContainer) {
        const gridRect = gridContainer.getBoundingClientRect()
        
        // Get the current position of the token (in normalized coordinates)
        const currentPosition = positions[active.id]
        
        // Get the final transform from the drag event (in pixels)
        const finalTransform = event.delta
        
        // Convert drag delta to normalized coordinates
        const normalizedDeltaX = finalTransform.x / GRID_SIZE
        const normalizedDeltaY = finalTransform.y / GRID_SIZE
        
        // Calculate new position in normalized coordinates
        const newNormalizedX = currentPosition.x + normalizedDeltaX
        const newNormalizedY = currentPosition.y + normalizedDeltaY
        
        // Calculate the circle's size in normalized coordinates
        const circleSize = TOKEN_SIZE / GRID_SIZE
        
        // Clamp the position to ensure the circle stays within bounds
        const clampedX = Math.max(0, Math.min(1, newNormalizedX))
        const clampedY = Math.max(0, Math.min(1, newNormalizedY))
        
        setPositions(prev => ({
          ...prev,
          [active.id]: { x: clampedX, y: clampedY }
        }))
      }
    }
    setActiveId(null)
  }

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null)
  }

  // Update position manually (useful for initialization or programmatic updates)
  const updatePosition = (tokenId: string, position: Position) => {
    setPositions(prev => ({
      ...prev,
      [tokenId]: position
    }))
  }

  return {
    positions,
    activeId,
    gridRef,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    updatePosition
  }
}  
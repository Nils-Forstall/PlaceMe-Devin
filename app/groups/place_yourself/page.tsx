'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DndContext } from '@dnd-kit/core'
import { useUserData } from '../../hooks/useUserData'
import { useGroupWorkflow } from '../../hooks/useGroupWorkflow'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'
import { DraggableToken } from '../../components/DraggableToken'
import { useDailyAxis } from '../../hooks/useDailyAxis'
import Axis from '../../components/Axis'

import { UI_CONSTANTS } from '../../constants/ui'

export default function PlaceYourself() {
  const router = useRouter()
  const { userName, firstName, userAvatar, loading: userLoading, error: userError } = useUserData()
  const { 
    loading, 
    error, 
    userGroups, 
    selectedGroup, 
    initializeWorkflow, 
    saveSelfPlacement 
  } = useGroupWorkflow()
  
  // Updated: useDailyAxis now handles the "once per day" logic internally
  const { dailyAxis, loading: axisLoading, error: axisError } = useDailyAxis(selectedGroup?.id || null)
  
  const [isSaving, setIsSaving] = useState(false)
  const [showHomeConfirm, setShowHomeConfirm] = useState(false)
  const [showPlacementError, setShowPlacementError] = useState(false)
  const [hasMovedToken, setHasMovedToken] = useState(false)
  
  // Start at center of grid in normalized coordinates (0-1)
  const initialPositions = { 
    'user-token': { 
      x: UI_CONSTANTS.INITIAL_POSITION.CENTER_X,
      y: UI_CONSTANTS.INITIAL_POSITION.CENTER_Y
    }
  }
  
  const {
    positions,
    activeId,
    gridRef,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleDragCancel
  } = useDragAndDrop(initialPositions)

  // Check if token has moved from initial position
  useEffect(() => {
    const currentPos = positions['user-token']
    const initialPos = initialPositions['user-token']
    const hasMoved = currentPos.x !== initialPos.x || currentPos.y !== initialPos.y
    setHasMovedToken(hasMoved)
  }, [positions])

  // Initialize workflow on component mount
  useEffect(() => {
    initializeWorkflow()
  }, [])

  // Handle home button click with confirmation
  const handleHomeClick = () => {
    setShowHomeConfirm(true)
  }

  // Confirm navigation to home (losing current axes)
  const confirmGoHome = () => {
    setShowHomeConfirm(false)
    router.push('/home')
  }

  // Cancel home navigation
  const cancelGoHome = () => {
    setShowHomeConfirm(false)
  }

  // Handle next button click
  const handleNextClick = () => {
    if (!hasMovedToken) {
      setShowPlacementError(true)
      return
    }
    handleNext()
  }

  // Close placement error popup
  const closePlacementError = () => {
    setShowPlacementError(false)
  }

  // Proceed to place others - UPDATED for new workflow
  const handleNext = async () => {
    if (!selectedGroup || !userName || !firstName) {
      console.error('Missing required user/group information')
      return
    }

    if (!dailyAxis) {
      console.error('Daily axis is still loading')
      return
    }

    if (!hasMovedToken) {
      console.error('User must move their token before proceeding')
      return
    }

    try {
      setIsSaving(true)
      
      const userPosition = positions['user-token']
      console.log('💾 Saving self placement with daily axis:', dailyAxis.id)
      
      // UPDATED: No longer need to pass saveAxisToDatabase function
      // The axis is already saved to database by useDailyAxis hook
      await saveSelfPlacement(userPosition, userName, firstName, dailyAxis)
      
      // Navigate to place_others
      router.push('/groups/place_others')
    } catch (err: any) {
      console.error('Error saving position:', err)
      // You could add error state display here if needed
    } finally {
      setIsSaving(false)
    }
  }

  // Loading state - wait for all required data
  if (loading || userLoading || axisLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FFF8E1]">
        <div className="text-2xl">Loading...</div>
        {loading && <div className="text-sm text-gray-600 mt-2">Loading groups...</div>}
        {axisLoading && <div className="text-sm text-gray-600 mt-2">Loading daily axes...</div>}
      </main>
    )
  }

  // Error state - show any errors that occurred
  if (error || userError || axisError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FFF8E1]">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl mb-4">
          {error || userError || axisError}
        </div>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg"
        >
          Go Back Home
        </button>
      </main>
    )
  }

  // Missing group state
  if (!selectedGroup) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#FFF8E1]">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-2xl mb-4">
          No group selected for workflow. Please try again.
        </div>
        <button
          onClick={() => {
            // Clear any stale session data and try again
            sessionStorage.removeItem('workflowGroupId')
            sessionStorage.removeItem('workflowGroupName') 
            sessionStorage.removeItem('workflowGroupCode')
            initializeWorkflow()
          }}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg"
        >
          Try Again
        </button>
      </main>
    )
  }

  return (
    <>
      <main className="flex min-h-screen flex-col items-center pt-8 p-4 bg-[#FFF8E1]">
        <div className="w-full max-w-sm">
          {/* Debug: Show selected group - IMPROVED */}
          <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-lg mb-2">Selected Group:</h3>
            <div className="flex justify-between items-center">
              <span className="font-medium">{selectedGroup.name}</span>
              <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                RANDOMLY SELECTED
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              From your {userGroups.length} group{userGroups.length !== 1 ? 's' : ''}
            </p>
            {/* Show axis info for debugging */}
            {dailyAxis && (
              <div className="mt-2 text-xs text-gray-500">
                <div>Axis ID: {dailyAxis.id}</div>
                <div>Generated: {dailyAxis.date_generated}</div>
                <div>Active: {dailyAxis.is_active ? 'Yes' : 'No'}</div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="bg-[#FFE082] py-4 px-4 rounded-full w-full mx-auto mb-8">
            <h1 className="text-4xl font-black text-center" style={{ 
              textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              color: 'white',
              fontFamily: 'Arial, sans-serif'
            }}>
              PLACE YOURSELF
            </h1>
          </div>
          
          <div className="space-y-6">
            <DndContext 
              sensors={sensors} 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div ref={gridRef} className="relative">
                <Axis
                  size={UI_CONSTANTS.AXIS_SIZE}
                  labels={dailyAxis?.labels || {
                    top: 'Loading...',
                    bottom: 'Loading...',
                    left: 'Loading...',
                    right: 'Loading...'
                  }}
                  labelColors={dailyAxis?.labels.labelColors}
                >
                  <DraggableToken
                    id="user-token"
                    position={positions['user-token']}
                    isDragging={activeId === 'user-token'}
                    userAvatar={userAvatar}
                    firstName={firstName}
                    isUnplaced={!hasMovedToken}
                  />
                </Axis>
              </div>
            </DndContext>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-center mt-8 space-x-4">
            {/* Home Button */}
            <button
              onClick={handleHomeClick}
              className="bg-gray-500 text-white px-6 py-3 rounded-full hover:bg-gray-600 transition"
            >
              <span className="text-lg font-black" style={{ 
                textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                color: 'white',
                fontFamily: 'Arial, sans-serif'
              }}>
                Home
              </span>
            </button>

            {/* Next Button - UPDATED conditions */}
            <button
              onClick={handleNextClick}
              disabled={isSaving || !selectedGroup || !dailyAxis || !userName || !firstName}
              className={`py-3 px-10 rounded-full transition ${
                hasMovedToken 
                  ? 'bg-[#60A5FA] hover:bg-[#3B82F6]' 
                  : 'bg-[#93C5FD] cursor-not-allowed'
              }`}
            >
              <span className="text-xl font-black" style={{ 
                textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                color: 'white',
                fontFamily: 'Arial, sans-serif'
              }}>
                {isSaving 
                  ? 'Saving...' 
                  : !dailyAxis 
                    ? 'Loading Axis...' 
                    : !userName || !firstName
                      ? 'Loading User...'
                      : 'Next'
                }
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Confirmation Popup - UPDATED message */}
      {showHomeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center">
              Leave Without Placing?
            </h3>
            <p className="text-gray-700 mb-6 text-center">
              You haven't placed yourself yet. The daily axes for {selectedGroup?.name} will remain available if you return today. Confirm?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelGoHome}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-bold hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmGoHome}
                className="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-600 transition"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placement Error Popup */}
      {showPlacementError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center">
              Place Yourself First
            </h3>
            <p className="text-gray-700 mb-6 text-center">
              Please place yourself on the axis before proceeding to place others.
            </p>
            <div className="flex justify-center">
              <button
                onClick={closePlacementError}
                className="bg-[#60A5FA] py-3 px-8 rounded-full hover:bg-[#3B82F6] transition"
              >
                <span className="text-lg font-black" style={{ 
                  textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                  color: 'white',
                  fontFamily: 'Arial, sans-serif'
                }}>
                  Got it
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// hooks/useGroupWorkflow.ts
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/auth/supabase'
import { Position, UserToken, UserGroup, GroupMember, DailyAxis } from '../types'
import { GroupService, ProfileService, PlacementService } from '../lib/services'
import { calculateInitialPositions, normalizePosition, convertToPercentage } from '../lib/utils/positionUtils'

export const useGroupWorkflow = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userGroups, setUserGroups] = useState<UserGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([])
  const [tokens, setTokens] = useState<UserToken[]>([])

  // Initialize the workflow - fetch user groups and randomly select one
  const initializeWorkflow = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error("Error fetching user:", userError)
        router.push('/login')
        return
      }
      
      setCurrentUserId(user.id)
      
      // Fetch groups the user is a member of
      const { data: groupMemberships, error: groupsError } = await GroupService.getGroupMemberships(user.id)
        
      if (groupsError) {
        console.error("Error fetching group memberships:", groupsError)
        setError('Failed to fetch your groups')
        return
      }
      
      // Get the groups details
      const groupIds = groupMemberships.map((membership: any) => membership.group_id)
      
      if (groupIds.length === 0) {
        setUserGroups([])
        setError('You are not part of any groups yet.')
        setLoading(false)
        return
      }
      
      const { data: groupsData, error: groupDetailsError } = await GroupService.getGroupDetails(groupIds)
      
      if (groupDetailsError) {
        console.error("Error fetching group details:", groupDetailsError)
        setError('Failed to fetch group details')
        return
      }
      
      // Combine the group details with membership info
      const formattedGroups = groupsData.map((group: any) => {
        const membership = groupMemberships.find((m: any) => m.group_id === group.id)
        return {
          id: group.id,
          name: group.name,
          invite_code: group.invite_code,
          role: membership?.role || 'member'
        }
      })
      
      setUserGroups(formattedGroups)
      
      // Randomly select one group for the workflow
      const randomIndex = Math.floor(Math.random() * formattedGroups.length)
      const randomGroup = formattedGroups[randomIndex]
      setSelectedGroup(randomGroup)
      
      // Store in session storage for persistence across workflow pages
      sessionStorage.setItem('workflowGroupId', randomGroup.id)
      sessionStorage.setItem('workflowGroupName', randomGroup.name)
      sessionStorage.setItem('workflowGroupCode', randomGroup.invite_code)
      
      console.log('🎯 Selected random group for workflow:', randomGroup.name, '(ID:', randomGroup.id, ')')
      
      // Fetch members for the selected group (but don't wait for it to complete loading)
      fetchGroupMembers(randomGroup.id, user.id)
      
    } catch (err: any) {
      console.error('Error initializing workflow:', err)
      setError(err.message || 'Failed to initialize workflow')
    } finally {
      setLoading(false)
    }
  }

  // Get workflow group from session storage (for subsequent pages)
  const getWorkflowGroup = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get the authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error("Error fetching user:", userError)
        router.push('/login')
        return
      }
      
      setCurrentUserId(user.id)
      
      // Get workflow group from session storage
      const groupId = sessionStorage.getItem('workflowGroupId')
      const groupName = sessionStorage.getItem('workflowGroupName')
      const groupCode = sessionStorage.getItem('workflowGroupCode')
      
      if (!groupId || !groupName || !groupCode) {
        setError('No active workflow group. Please start from place yourself.')
        return
      }
      
      const workflowGroup = {
        id: groupId,
        name: groupName,
        invite_code: groupCode,
        role: 'member' // We don't store role in session, but it's not critical here
      }
      
      setSelectedGroup(workflowGroup)
      console.log('📋 Retrieved workflow group from session:', workflowGroup.name, '(ID:', workflowGroup.id, ')')
      
      // Fetch members for the workflow group
      await fetchGroupMembers(groupId, user.id)
      
    } catch (err: any) {
      console.error('Error getting workflow group:', err)
      setError(err.message || 'Failed to get workflow group')
    } finally {
      setLoading(false)
    }
  }

  // Fetch group members for a specific group
  const fetchGroupMembers = async (groupId: string, currentUserId: string) => {
    try {
      // Fetch group members
      const { data: membersData, error: membersError } = await GroupService.getGroupMembers(groupId)
        
      if (membersError) {
        console.error("Error fetching group members:", membersError)
        setError('Failed to load group members')
        return
      }
      
      // Get user profiles for the members
      const memberUserIds = membersData.map((member: any) => member.user_id)
      
      const { data: profiles, error: profilesError } = await ProfileService.getProfiles(memberUserIds)
        
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        setError('Failed to load member profiles')
        return
      }
      
      // Transform member data
      const allGroupMembers = membersData.map((member: any, index: number) => {
        const profile = profiles.find((p: any) => p.id === member.user_id)
        return {
          user_id: member.user_id,
          username: profile?.name || `User ${index + 1}`,
          avatar_url: profile?.avatar_url || `https://i.pravatar.cc/150?img=${index + 1}`,
          role: member.role
        }
      })
      
      setGroupMembers(allGroupMembers)
      
      // Create tokens for other members (excluding current user)
      const otherMembers = allGroupMembers.filter((member: any) => member.user_id !== currentUserId)
      const initialPositions = calculateInitialPositions(otherMembers.length)
      
      const userTokens: UserToken[] = otherMembers.map((member: any, index: number) => ({
        id: member.user_id,
        firstName: member.username,
        userAvatar: member.avatar_url,
        position: initialPositions[index]
      }))
      
      setTokens(userTokens)
      console.log(`👥 Loaded ${allGroupMembers.length} group members (${otherMembers.length} others to place)`)
      
    } catch (err: any) {
      console.error('Error fetching group members:', err)
      setError('Failed to load group members')
    }
  }

  // Handle position changes for place others
  // Positions are received in normalized coordinates (0-1)
  const handlePositionChange = async (tokenId: string, position: Position) => {
    try {
      const normalizedPosition = normalizePosition(position)
      
      setTokens(prevTokens => 
        prevTokens.map(token => 
          token.id === tokenId 
            ? { ...token, position: normalizedPosition }
            : token
        )
      )
      
      console.log(`📍 Updated position for ${tokenId}:`, normalizedPosition)
    } catch (err: any) {
      console.error('Error updating position:', err)
      setError(err.message || 'Failed to update position')
    }
  }

  /**
   * Save self placement - UPDATED for new workflow
   * No longer needs saveAxisToDatabase function since axes are already in database
   */
  const saveSelfPlacement = async (
    position: Position, 
    userName: string, 
    firstName: string, 
    dailyAxis: DailyAxis
  ) => {
    if (!selectedGroup || !currentUserId) {
      throw new Error('Missing user or group information')
    }
    
    if (!dailyAxis) {
      throw new Error('Missing daily axis information')
    }
    
    try {
      console.log('💾 Saving self placement for user:', firstName)
      console.log('📊 Using daily axis:', dailyAxis.id, 'for group:', selectedGroup.name)

      const targetAxisId = sessionStorage.getItem('targetAxisId')
      if (targetAxisId) {
        console.log('🎯 Clearing target axis after placement')
        sessionStorage.removeItem('targetAxisId')
      }
      
      // Ensure position is in normalized coordinates (0-1)
      const normalizedPosition = normalizePosition(position)
      
      // Convert to percentage for database storage
      const percentagePosition = convertToPercentage(normalizedPosition)
      
      // Get today's date for consistency
      const today = new Date().toISOString().split('T')[0]
      
      // Check if user already placed themselves today for this group
      const { data: existingPlacement, error: checkError } = await PlacementService.checkExistingSelfPlacement(
        currentUserId, 
        selectedGroup.id, 
        dailyAxis.id
      )

      if (checkError) {
        console.error('Error checking existing placement:', checkError)
        // Continue anyway - we'll let the database handle duplicates
      }

      if (existingPlacement) {
        console.log('📝 User already placed themselves today, updating existing placement')
        
        // Update existing placement
        const { error: updateError } = await PlacementService.updateSelfPlacement(existingPlacement.id, {
          position_x: percentagePosition.x,
          position_y: percentagePosition.y,
          updated_at: new Date().toISOString()
        })

        if (updateError) {
          console.error('❌ Error updating self placement:', updateError)
          throw updateError
        }

        console.log('✅ Successfully updated self placement')
        return
      }

      // Insert new placement
      const { error: insertError } = await PlacementService.saveSelfPlacement({
        user_id: currentUserId,
        group_id: selectedGroup.id,
        group_code: selectedGroup.invite_code,
        username: userName,
        first_name: firstName,
        position_x: percentagePosition.x,
        position_y: percentagePosition.y,
        top_label: dailyAxis.labels.top,
        bottom_label: dailyAxis.labels.bottom,
        left_label: dailyAxis.labels.left,
        right_label: dailyAxis.labels.right,
        axis_id: dailyAxis.id,
        vertical_axis_pair_id: dailyAxis.vertical_axis_pair_id,
        horizontal_axis_pair_id: dailyAxis.horizontal_axis_pair_id,
        date_placed: today
      })
      
      if (insertError) {
        console.error('❌ Error inserting self placement:', insertError)
        throw insertError
      }
      
      console.log('✅ Successfully saved new self placement')
      
    } catch (err: any) {
      console.error('Error saving self placement:', err)
      throw new Error(err.message || 'Failed to save your placement')
    }
  }

  /**
   * Save others placements - UPDATED for new workflow
   */
  const saveOthersPlacement = async (dailyAxis: DailyAxis) => {
    if (!selectedGroup || !currentUserId) {
      throw new Error('Missing user or group information')
    }
    
    if (!dailyAxis) {
      throw new Error('Missing daily axis information')
    }
    
    try {
      console.log('💾 Starting to save others placements...')
      console.log('📊 Group:', selectedGroup.name, '(ID:', selectedGroup.id, ')')
      console.log('👤 Current user:', currentUserId)
      console.log('🎯 Daily axis:', dailyAxis.id)
      console.log('📍 Number of tokens to save:', tokens.length)
      
      // Get today's date for consistency
      const today = new Date().toISOString().split('T')[0]
      
      // Clear existing placements by this user for this axis to avoid duplicates
      console.log('🧹 Clearing existing placements...')
      const { error: deleteError } = await PlacementService.clearExistingOthersPlacements(currentUserId, dailyAxis.id)

      if (deleteError) {
        console.warn('⚠️ Could not clear existing placements:', deleteError)
      } else {
        console.log('✅ Successfully cleared existing placements')
      }

      // Insert new placements
      const placementsToInsert = tokens.map(token => {
        const percentagePosition = convertToPercentage(token.position)
        console.log(`📍 Token ${token.firstName}:`, percentagePosition)
        
        return {
          placer_user_id: currentUserId,
          placed_user_id: token.id,
          group_id: selectedGroup.id,
          group_code: selectedGroup.invite_code,
          username: token.firstName,
          first_name: token.firstName,
          position_x: percentagePosition.x,
          position_y: percentagePosition.y,
          top_label: dailyAxis.labels.top,
          bottom_label: dailyAxis.labels.bottom,
          left_label: dailyAxis.labels.left,
          right_label: dailyAxis.labels.right,
          axis_id: dailyAxis.id,
          vertical_axis_pair_id: dailyAxis.vertical_axis_pair_id,
          horizontal_axis_pair_id: dailyAxis.horizontal_axis_pair_id,
          date_placed: today
        }
      })

      if (placementsToInsert.length > 0) {
        console.log('💾 Inserting', placementsToInsert.length, 'new placements...')
        const { error: insertError } = await PlacementService.saveOthersPlacement(placementsToInsert)
        
        if (insertError) {
          console.error('❌ Error saving others placements:', insertError)
          throw insertError
        }
        
        console.log('✅ Successfully saved all placements')
      } else {
        console.log('ℹ️ No other members to place')
      }
      
    } catch (err: any) {
      console.error('❌ Error in saveOthersPlacement:', err)
      throw new Error(err.message || 'Failed to save placements')
    }
  }

  return {
    loading,
    error,
    currentUserId,
    userGroups,
    selectedGroup,
    groupMembers,
    tokens,
    initializeWorkflow,
    getWorkflowGroup,
    handlePositionChange,
    saveSelfPlacement,
    saveOthersPlacement
  }
}

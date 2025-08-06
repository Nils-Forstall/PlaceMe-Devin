// hooks/useCurrentGroup.js
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../lib/auth/supabase'
import { CurrentGroup } from '../types'
import { GroupService, ProfileService } from '../lib/services'

export const useCurrentGroup = () => {
  const router = useRouter()
  const params = useParams()
  const [currentGroup, setCurrentGroup] = useState<CurrentGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUserGroupCreator, setIsUserGroupCreator] = useState(false)

  useEffect(() => {
    const fetchCurrentGroup = async () => {
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

        // Get group ID from URL params (e.g., /groups/[groupId]/moderator)
        const groupId = params?.groupId as string
        
        if (!groupId) {
          setError('No group ID found in URL')
          return
        }

        console.log('Fetching group data for:', groupId)

        // Fetch group details
        const { data: groupData, error: groupError } = await GroupService.getGroupById(groupId)

        if (groupError) {
          console.error('Error fetching group:', groupError)
          setError('Failed to fetch group details')
          return
        }

        console.log('Group data:', groupData)

        // Get creator's profile info
        let creatorName = 'Unknown'
        if (groupData.created_by) {
          const { data: creatorProfile, error: creatorError } = await ProfileService.getProfile(groupData.created_by)

          if (!creatorError && creatorProfile) {
            creatorName = creatorProfile.name || 'Unknown'
          }
        }

        // Get member count
        const { data: membersData, error: membersError } = await GroupService.getGroupMembers(groupId)

        let memberCount = 0
        if (!membersError && membersData) {
          memberCount = membersData.length
        }

        // Check if current user is the group creator
        setIsUserGroupCreator(user.id === groupData.created_by)

        // Set the current group data
        setCurrentGroup({
          id: groupData.id,
          name: groupData.name,
          invite_code: groupData.invite_code,
          created_by: groupData.created_by,
          created_at: groupData.created_at,
          creator_name: creatorName,
          member_count: memberCount
        })

        console.log('Current group set:', {
          name: groupData.name,
          creator: creatorName,
          memberCount,
          isCreator: user.id === groupData.created_by
        })

      } catch (err: any) {
        console.error('Error in fetchCurrentGroup:', err)
        setError(err.message || 'Failed to fetch group data')
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentGroup()
  }, [params?.groupId, router])

  // Format the created date
  const getFormattedCreatedDate = () => {
    if (!currentGroup?.created_at) return 'Unknown'
    
    const date = new Date(currentGroup.created_at)
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit', 
      year: 'numeric'
    })
  }

  return {
    currentGroup,
    loading,
    error,
    isUserGroupCreator,
    formattedCreatedDate: getFormattedCreatedDate()
  }
}

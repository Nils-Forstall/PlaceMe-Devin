import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/auth/supabase'
import { UserData } from '../types'
import { GroupService, ProfileService } from '../lib/services'

// Helper function to capitalize first letter
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function useUserData(): UserData {
  const router = useRouter()
  const [userName, setUserName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [userAvatar, setUserAvatar] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        
        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push('/login')
          return
        }
        
        // Get current user ID from session storage if available
        const currentUserId = sessionStorage.getItem('currentUserId') || user.id
        
        // Get user profile
        const { data: profile, error: profileError } = await ProfileService.getProfile(currentUserId)
        
        if (profileError) {
          console.error('Error fetching profile:', profileError)
          const defaultName = user.email?.split('@')[0] || 'User'
          setUserName(capitalizeFirstLetter(defaultName))
          setFirstName(capitalizeFirstLetter(defaultName))
        } else if (profile) {
          const fullName = profile.username || profile.full_name || user.email || 'User'
          const firstName = profile.full_name?.split(' ')[0] || profile.username || user.email?.split('@')[0] || 'User'
          
          setUserName(capitalizeFirstLetter(fullName))
          setFirstName(capitalizeFirstLetter(firstName))
          setUserAvatar(profile.avatar_url || '')
          
          // Save user info to session storage with correct capitalization
          sessionStorage.setItem('currentUserName', capitalizeFirstLetter(fullName))
          sessionStorage.setItem('currentFirstName', capitalizeFirstLetter(firstName))
          sessionStorage.setItem('currentUserAvatar', profile.avatar_url || '')
        }
        
        await handleGroupManagement(currentUserId)
      } catch (err: any) {
        console.error('Error fetching user data:', err)
        setError(err.message || 'Failed to load user data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserData()
  }, [router, firstName])

  const handleGroupManagement = async (currentUserId: string) => {
    // Check group information
    const groupId = sessionStorage.getItem('currentGroupId')
    const groupCode = sessionStorage.getItem('currentGroupCode')
    
    if (groupId && groupCode) {
      // Check if user is a member
      const { error: memberError } = await GroupService.checkMembership(currentUserId, groupId)
      
      if (memberError?.code === 'PGRST116') {
        // Add user as member
        await GroupService.addGroupMember({
          group_id: groupId,
          user_id: currentUserId,
          role: 'member'
        })
      }
    } else {
      await handleNoGroupCase(currentUserId)
    }
  }

  const handleNoGroupCase = async (currentUserId: string) => {
    // Try to find a group
    const { data: createdGroups } = await supabase
      .from('groups')
      .select('*')
      .eq('created_by', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (createdGroups?.length) {
      const group = createdGroups[0]
      sessionStorage.setItem('currentGroupId', group.id)
      sessionStorage.setItem('currentGroupCode', group.invite_code)
      sessionStorage.setItem('currentGroupName', group.name)
      
      // Add creator as member if needed
      const { error: memberError } = await GroupService.checkMembership(currentUserId, group.id)
      
      if (memberError?.code === 'PGRST116') {
        await GroupService.addGroupMember({
          group_id: group.id,
          user_id: currentUserId,
          role: 'creator'
        })
      }
    } else {
      await handleGroupMembership(currentUserId)
    }
  }

  const handleGroupMembership = async (currentUserId: string) => {
    // Check for group memberships
    const { data: groupMemberships } = await GroupService.getGroupMemberships(currentUserId)
    
    if (groupMemberships?.length) {
      const { data: group } = await GroupService.getGroupById(groupMemberships[0].group_id)
        
      if (group) {
        sessionStorage.setItem('currentGroupId', group.id)
        sessionStorage.setItem('currentGroupCode', group.invite_code)
        sessionStorage.setItem('currentGroupName', group.name)
      } else {
        setError('Could not retrieve group details. Please create or join a group first.')
      }
    } else {
      setError('No active group found. Please create or join a group first.')
      setTimeout(() => router.push('/groups/create_group'), 3000)
    }
  }

  return { userName, firstName, userAvatar, loading, error }
}  
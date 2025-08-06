import { supabase } from '../../../lib/auth/supabase'

export class GroupService {
  static async getGroupMemberships(userId: string) {
    return supabase
      .from('group_members')
      .select('group_id, role, id, joined_at')
      .eq('user_id', userId)
  }

  static async getGroupDetails(groupIds: string[]) {
    return supabase
      .from('groups')
      .select('id, name, invite_code, created_by, settings, created_at')
      .in('id', groupIds)
  }

  static async getGroupById(groupId: string) {
    return supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()
  }

  static async getGroupByInviteCode(inviteCode: string) {
    return supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .single()
  }

  static async createGroup(groupData: {
    name: string
    invite_code: string
    created_by: string
    created_at: string
  }) {
    return supabase
      .from('groups')
      .insert(groupData)
      .select()
      .single()
  }

  static async getGroupMembers(groupId: string) {
    return supabase
      .from('group_members')
      .select('id, role, user_id, joined_at')
      .eq('group_id', groupId)
  }

  static async addGroupMember(memberData: {
    group_id: string
    user_id: string
    role: string
    joined_at?: string
  }) {
    return supabase
      .from('group_members')
      .insert({
        ...memberData,
        joined_at: memberData.joined_at || new Date().toISOString()
      })
  }

  static async removeGroupMember(userId: string, groupId: string) {
    return supabase
      .from('group_members')
      .delete()
      .eq('user_id', userId)
      .eq('group_id', groupId)
  }

  static async checkMembership(userId: string, groupId: string) {
    return supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()
  }

  static async getUserMembershipByGroup(userId: string, groupId: string) {
    return supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .single()
  }
}

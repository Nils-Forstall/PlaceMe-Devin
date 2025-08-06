import { supabase } from '../../lib/auth/supabase'

export class ProfileService {
  static async getProfile(userId: string) {
    return supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  }

  static async getProfiles(userIds: string[]) {
    return supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds)
  }

  static async getProfilesByName(userIds: string[]) {
    return supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', userIds)
  }

  static async updateProfile(userId: string, profileData: any) {
    return supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
  }
}

import { supabase } from '../../../lib/auth/supabase'

export class PlacementService {
  static async getSelfPlacements(groupId: string, axisId: string) {
    return supabase
      .from('place_yourself')
      .select('*')
      .eq('group_id', groupId)
      .eq('axis_id', axisId)
      .order('created_at', { ascending: false })
  }

  static async getOthersPlacements(groupId: string, axisId: string) {
    return supabase
      .from('place_others')
      .select('*')
      .eq('group_id', groupId)
      .eq('axis_id', axisId)
      .order('created_at', { ascending: false })
  }

  static async getUserPlacements(userId: string, axisIds: string[]) {
    return supabase
      .from('place_yourself')
      .select('axis_id')
      .eq('user_id', userId)
      .in('axis_id', axisIds)
  }

  static async saveSelfPlacement(placementData: {
    user_id: string
    group_id: string
    group_code: string
    username: string
    first_name: string
    position_x: number
    position_y: number
    top_label: string
    bottom_label: string
    left_label: string
    right_label: string
    axis_id: string
    vertical_axis_pair_id: string
    horizontal_axis_pair_id: string
    date_placed: string
  }) {
    return supabase
      .from('place_yourself')
      .insert(placementData)
  }

  static async updateSelfPlacement(placementId: string, updates: {
    position_x: number
    position_y: number
    updated_at: string
  }) {
    return supabase
      .from('place_yourself')
      .update(updates)
      .eq('id', placementId)
  }

  static async checkExistingSelfPlacement(userId: string, groupId: string, axisId: string) {
    return supabase
      .from('place_yourself')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('axis_id', axisId)
      .maybeSingle()
  }

  static async saveOthersPlacement(placementData: any[]) {
    return supabase
      .from('place_others')
      .insert(placementData)
  }

  static async clearExistingOthersPlacements(placerUserId: string, axisId: string) {
    return supabase
      .from('place_others')
      .delete()
      .eq('placer_user_id', placerUserId)
      .eq('axis_id', axisId)
  }
}

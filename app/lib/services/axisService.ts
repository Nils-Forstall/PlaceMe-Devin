import { supabase } from '../../../lib/auth/supabase'

export class AxisService {
  static async getAxesForGroup(groupId: string, limit: number = 10) {
    return supabase
      .from('axes')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  static async getTodaysAxis(groupId: string, date: string) {
    return supabase
      .from('axes')
      .select('*')
      .eq('group_id', groupId)
      .eq('date_generated', date)
      .eq('is_active', true)
      .maybeSingle()
  }

  static async getAxisById(axisId: string) {
    return supabase
      .from('axes')
      .select('*')
      .eq('id', axisId)
      .single()
  }

  static async getRecentAxes(groupId: string, limit: number = 10) {
    return supabase
      .from('axes')
      .select('vertical_axis_pair_id, horizontal_axis_pair_id')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  static async createAxis(axisData: {
    group_id: string
    vertical_axis_pair_id: string
    horizontal_axis_pair_id: string
    left_label: string
    right_label: string
    top_label: string
    bottom_label: string
    date_generated: string
    is_active: boolean
  }) {
    return supabase
      .from('axes')
      .insert(axisData)
      .select('*')
      .single()
  }

  static async deactivateAxes(groupId: string) {
    return supabase
      .from('axes')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('is_active', true)
  }
}

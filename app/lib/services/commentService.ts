import { supabase } from '../../lib/auth/supabase'

export class CommentService {
  static async getComments(groupId: string, targetUserId: string, viewType: string, axisId: string) {
    return supabase
      .from('comments')
      .select('*')
      .eq('group_id', groupId)
      .eq('target_user_id', targetUserId)
      .eq('view_type', viewType)
      .eq('axis_id', axisId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
  }

  static async addComment(commentData: {
    group_id: string
    commenter_user_id: string
    target_user_id: string
    view_type: string
    axis_id: string
    comment_text: string
    is_deleted: boolean
  }) {
    return supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single()
  }

  static async deleteComment(commentId: string) {
    return supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', commentId)
  }
}

export interface Position {
  x: number
  y: number
}

export interface UserToken {
  id: string
  firstName: string
  userAvatar: string
  position: Position
}

export interface GroupMember {
  user_id: string
  username: string
  avatar_url: string
  role: string
}

export interface UserGroup {
  id: string
  name: string
  invite_code: string
  role: string
}

export interface DailyAxis {
  id: string
  group_id: string
  vertical_axis_pair_id: string
  horizontal_axis_pair_id: string
  left_label: string
  right_label: string
  top_label: string
  bottom_label: string
  date_generated: string
  is_active: boolean
  labels: {
    top: string
    bottom: string
    left: string
    right: string
    labelColors: {
      top: string
      bottom: string
      left: string
      right: string
    }
  }
}

export interface Profile {
  id: string
  name: string
  avatar_url: string
}

export interface ResultToken {
  user_id: string
  username: string
  avatar_url: string
  color: string
  x: number
  y: number
}

export interface IndividualGuess {
  guesser_id: string
  guesser_name: string
  guesser_avatar: string
  position: { x: number; y: number }
}

export interface GuessedResult {
  user_id: string
  username: string
  avatar_url: string
  color: string
  averagePosition: { x: number; y: number }
  individualGuesses: IndividualGuess[]
}

export interface GroupResults {
  selfPlaced: ResultToken[]
  guessed: GuessedResult[]
}

export interface Placement {
  placer_user_id: string
  placed_user_id: string
  created_at: string
  position_x: number
  position_y: number
  username: string
  first_name: string
}

export interface CurrentGroup {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  creator_name?: string
  member_count?: number
}

export interface UserData {
  userName: string
  firstName: string
  userAvatar: string
  loading: boolean
  error: string | null
}

export interface ActionResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ActionState<T> {
  data?: T
  error?: string
  pending: boolean
}

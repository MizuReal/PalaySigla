import type { NavigatorScreenParams } from '@react-navigation/native'

export type SettingsTab = 'account' | 'farmer' | 'listings' | 'purchases'

export type MainTabParamList = {
  Marketplace: undefined
  Community: undefined
  Scan: undefined
  Settings: { tab?: SettingsTab } | undefined
}

export type RootStackParamList = {
  Landing: undefined
  Main: NavigatorScreenParams<MainTabParamList> | undefined
  ListingDetail: { listingId: string }
  PostListing: undefined
  Messages: undefined
  Conversation: { conversationId: string }
  ReviewForm: { transactionId: string }
  ForumThread: { postId: string }
  ForumPostEditor: { postId?: string } | undefined
  FarmerProfile: { userId: string }
  NotFound: undefined
}

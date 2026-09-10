import type { NavigatorScreenParams } from '@react-navigation/native'

export type MainTabParamList = {
  Marketplace: undefined
  Community: undefined
  Scan: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Landing: undefined
  Main: NavigatorScreenParams<MainTabParamList> | undefined
  ListingDetail: { listingId: string }
}

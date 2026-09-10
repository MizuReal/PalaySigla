// Shared shell for tab screens: canvas viewport, brand chrome on top, and a
// scrollable body. Content is left unpadded so scroll areas can breathe;
// FeatureNotice supplies its own gutters.
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import BrandBar from './BrandBar'
import { COLORS } from '../theme/designTokens'

interface TabScreenProps {
  children: ReactNode
}

function TabScreen({ children }: TabScreenProps) {
  return (
    <View style={styles.screen}>
      <BrandBar />
      <ScrollView style={styles.body}>{children}</ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  body: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
})

export default TabScreen

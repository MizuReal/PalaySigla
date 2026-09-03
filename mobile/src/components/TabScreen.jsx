// Shared shell for tab screens: canvas viewport, brand chrome on top, and a
// scrollable body. Content is left unpadded so scroll areas can breathe;
// FeatureNotice supplies its own gutters.
import { ScrollView, StyleSheet, View } from 'react-native'
import BrandBar from './BrandBar.jsx'
import { COLORS } from '../theme/designTokens.js'

function TabScreen({ children }) {
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

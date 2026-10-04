import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AdSlot } from '@/components/AdSlot';
import { AppScreen } from '@/components/AppScreen';
import { Billboard } from '@/components/Billboard';
import { Logo } from '@/components/Logo';
import { ToolCard } from '@/components/ToolCard';
import { FEATURED_TOOL_IDS, toolById } from '@/constants/tools';
import { colors, space } from '@/constants/theme';
import { useEditor } from '@/context/EditorContext';

export default function HomeScreen() {
  const router = useRouter();
  const { projects } = useEditor();
  const featured = FEATURED_TOOL_IDS.map((id) => toolById(id)).filter(Boolean);

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Logo />
        <Text style={styles.headline}>One tap. Better photos.</Text>

        <Billboard />

        <Text style={styles.section}>Featured tools</Text>
        <View style={styles.grid}>
          {featured.map((tool) =>
            tool ? (
              <View key={tool.id} style={styles.cell}>
                <ToolCard
                  tool={tool}
                  onPress={() => router.push({ pathname: '/editor/[toolId]', params: { toolId: tool.id } })}
                />
              </View>
            ) : null
          )}
        </View>

        <Text style={styles.section}>Recent projects</Text>
        {projects.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/edit')}
            style={styles.empty}>
            <Text style={styles.emptyTitle}>No edits yet</Text>
            <Text style={styles.emptyBody}>Pick a photo and tap Auto Edit to start.</Text>
          </Pressable>
        ) : (
          projects.slice(0, 3).map((project) => (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityLabel={`Reopen ${project.toolName} edit`}
              onPress={() =>
                router.push({ pathname: '/editor/[toolId]', params: { toolId: project.toolId } })
              }
              style={styles.recent}>
              <Image source={{ uri: project.resultUri }} style={styles.recentThumb} />
              <View style={styles.recentTexts}>
                <Text style={styles.recentTitle}>{project.toolName}</Text>
                <Text style={styles.recentBody}>Saved locally on this device</Text>
              </View>
            </Pressable>
          ))
        )}

        <AdSlot />
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: space.md,
    paddingBottom: space.xl,
    gap: space.md,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: space.xs,
  },
  section: {
    marginTop: space.sm,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
  },
  recent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  recentThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  recentTexts: {
    flex: 1,
  },
  recentTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  recentBody: {
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 13,
  },
});

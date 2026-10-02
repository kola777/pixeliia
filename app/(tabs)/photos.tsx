import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AdSlot } from '@/components/AdSlot';
import { AppScreen } from '@/components/AppScreen';
import { colors, radius, space } from '@/constants/theme';
import { useEditor } from '@/context/EditorContext';

export default function PhotosScreen() {
  const router = useRouter();
  const { projects, openProject } = useEditor();

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>My Photos</Text>
        <Text style={styles.lede}>Recent edits stay on this device for now.</Text>

        {projects.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyBody}>Finished edits will appear here after you export.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/edit')} style={styles.link}>
              <Text style={styles.linkLabel}>Start an edit</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.grid}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => {
                  openProject(project.id);
                  router.push({ pathname: '/editor/[toolId]', params: { toolId: project.toolId } });
                }}
                style={styles.card}>
                <Image source={{ uri: project.resultUri }} style={styles.thumb} />
                <Text style={styles.cardTitle}>{project.toolName}</Text>
              </Pressable>
            ))}
          </View>
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
  },
  lede: {
    color: colors.textMuted,
    marginTop: -8,
  },
  empty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  emptyBody: {
    color: colors.textMuted,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkLabel: {
    color: colors.accent,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  card: {
    width: '48%',
    flexGrow: 1,
  },
  thumb: {
    width: '100%',
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  cardTitle: {
    marginTop: 8,
    fontWeight: '600',
    color: colors.text,
  },
});

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { Calendar, Clock, Music } from 'lucide-react-native';

interface Props {
  coverUrl: string;
  title: string;
  subtitle?: string;
  description?: string;
  releaseDate?: string;
  duration?: string;
  playCount?: number;
  genres?: string[];
}

export default function Hero({
  coverUrl,
  title,
  subtitle,
  description,
  releaseDate,
  duration,
  playCount,
  genres,
}: Props) {
  return (
    <View style={[styles.card, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
      <Image source={{ uri: coverUrl }} style={styles.cover} />

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}

      {(releaseDate || duration || playCount !== undefined) && (
        <View style={styles.meta}>
          {releaseDate && (
            <View style={styles.metaItem}>
              <Calendar color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{releaseDate}</Text>
            </View>
          )}
          {duration && (
            <View style={styles.metaItem}>
              <Clock color="#94a3b8" size={16} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          )}
          {playCount !== undefined && (
            <View style={styles.metaItem}>
              <Music color="#94a3b8" size={16} />
              <Text style={styles.metaText}>
                {playCount.toLocaleString()} plays
              </Text>
            </View>
          )}
        </View>
      )}

      {genres && genres.length > 0 && (
        <View style={styles.genresContainer}>
          {genres.map((genre, idx) => (
            <View key={idx} style={styles.genreTag}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    marginBottom: 30,
  },
  cover: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#a855f7',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  metaItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  genresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  genreTag: {
    backgroundColor: 'rgba(139,92,246,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  genreText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
  },
  // Glass card styling - matches track detail
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brutalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});
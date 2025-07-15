import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { searchArtistsByName, findOrCreateArtistByName, ArtistData } from '@/services/artistService';
import { User, X } from 'lucide-react-native';

interface ArtistAutocompleteProps {
  placeholder?: string;
  onArtistSelect: (artist: ArtistData) => void;
  onClear?: () => void;
  style?: any;
  disabled?: boolean;
  initialValue?: string;
}

export function ArtistAutocomplete({
  placeholder = "Search for artist...",
  onArtistSelect,
  onClear,
  style,
  disabled = false,
  initialValue = '',
}: ArtistAutocompleteProps) {
  // Initialize with provided initialValue
  const [query, setQuery] = useState<string>(initialValue);
  const [suggestions, setSuggestions] = useState<ArtistData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Use a nullable ref to debounce searches
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchArtistsByName(query, 8);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching artists:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleArtistSelect = (artist: ArtistData) => {
    setQuery(artist.name);
    setShowSuggestions(false);
    onArtistSelect(artist);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
  };

  const handleCreateNewArtist = async () => {
    try {
      Keyboard.dismiss();
      const artist = await findOrCreateArtistByName(query);
      if (!artist) return;
      setQuery(artist.name);
      setSuggestions([]);
      setShowSuggestions(false);
      onArtistSelect(artist);
    } catch (error) {
      console.error("Failed to create new artist:", error);
    }
  };

  const renderSuggestionItem = ({ item }: { item: ArtistData }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleArtistSelect(item)}
    >
      <View style={styles.artistIcon}>
        <User color="#8b5cf6" size={16} />
      </View>
      <Text style={styles.suggestionText} numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const shouldOfferCreate =
    query.length > 2 &&
    !suggestions.some(a => a.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, style]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor="#64748b"
              value={query}
              onChangeText={setQuery}
              editable={!disabled}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
            />
            {query.length > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <X color="#64748b" size={16} />
              </TouchableOpacity>
            )}
          </View>

          {(showSuggestions || shouldOfferCreate) && (
            <FlatList
              data={suggestions}
              renderItem={renderSuggestionItem}
              keyExtractor={item => item.id}
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                shouldOfferCreate && !isLoading ? (
                  <TouchableOpacity
                    style={[styles.suggestionItem, { backgroundColor: 'rgba(139, 92, 246, 0.05)' }]}
                    onPress={handleCreateNewArtist}
                  >
                    <Text style={[styles.suggestionText, { color: '#8b5cf6' }]}>+ Create “{query.trim()}”</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )}

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  artistIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 16,
    alignItems: 'center',
    zIndex: 1001,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
});

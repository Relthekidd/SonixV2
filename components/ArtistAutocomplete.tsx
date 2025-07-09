import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { searchArtistsByName, ArtistData } from '@/services/artistService';
import { supabase } from '@/lib/supabase'; // make sure this path is correct
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
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<ArtistData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

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
    onArtistSelect(artist); // return full object
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
  };

  const handleCreateNewArtist = async () => {
    const name = query.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from('artists')
      .insert([{ name }])
      .select()
      .single();

    if (error) {
      console.error('Error creating artist:', error);
      return;
    }

    setQuery(data.name);
    setSuggestions([]);
    setShowSuggestions(false);
    onArtistSelect(data);
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
    !suggestions.some((a) => a.name.toLowerCase() === query.trim().toLowerCase());

  return (
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
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />

          {shouldOfferCreate && !isLoading && (
            <TouchableOpacity
              style={[styles.suggestionItem, { backgroundColor: 'rgba(139, 92, 246, 0.05)' }]}
              onPress={handleCreateNewArtist}
            >
              <Text style={[styles.suggestionText, { color: '#8b5cf6' }]}>
                + Create “{query.trim()}”
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}
    </View>
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
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    maxHeight: 200,
    zIndex: 1001,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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

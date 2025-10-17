'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { googleMapsService, GooglePlacePrediction } from '@/lib/googleMaps';

interface LocationSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  placeholder = "City, State or ZIP code...",
  className = ""
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search function with Google Maps API and Nominatim fallback
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Try Google Maps first
      const predictions = await googleMapsService.getPlacePredictions(query);
      
      if (predictions.length > 0) {
        const formattedSuggestions = predictions.map((prediction: GooglePlacePrediction) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          main_text: prediction.structured_formatting.main_text,
          secondary_text: prediction.structured_formatting.secondary_text,
          types: prediction.types,
        }));
        
        setSuggestions(formattedSuggestions);
        setIsOpen(formattedSuggestions.length > 0);
        setSelectedIndex(-1);
      } else {
        // Fallback to Nominatim if Google Maps returns no results
        await searchWithNominatim(query);
      }
    } catch (error) {
      console.error('Error with Google Maps, trying Nominatim fallback:', error);
      await searchWithNominatim(query);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fallback search function using Nominatim (OpenStreetMap) API
  const searchWithNominatim = async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=us`
      );
      
      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions = data.map((item: any) => ({
          place_id: item.place_id,
          description: item.display_name,
          main_text: item.display_name.split(',')[0] || item.display_name,
          secondary_text: item.display_name.split(',').slice(1).join(',').trim() || '',
          types: [item.type],
        }));
        
        setSuggestions(formattedSuggestions);
        setIsOpen(formattedSuggestions.length > 0);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Error fetching location suggestions from Nominatim:', error);
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = async (suggestion: LocationSuggestion) => {
    try {
      // Try to get detailed place information from Google Maps
      const placeDetails = await googleMapsService.getPlaceDetails(suggestion.place_id);
      
      if (placeDetails) {
        const formattedLocation = googleMapsService.formatLocationFromPlaceDetails(placeDetails);
        onChange(formattedLocation, {
          lat: placeDetails.geometry.location.lat,
          lng: placeDetails.geometry.location.lng,
        });
      } else {
        // Fallback: try to get coordinates from Nominatim
        const coordinates = await getNominatimCoordinates(suggestion.description);
        onChange(suggestion.description, coordinates);
      }
      
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error getting place details:', error);
      // Final fallback: just use the description
      onChange(suggestion.description);
      setIsOpen(false);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  };

  // Get coordinates from Nominatim for fallback
  const getNominatimCoordinates = async (location: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1&countrycodes=us`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
          };
        }
      }
    } catch (error) {
      console.error('Error getting coordinates from Nominatim:', error);
    }
    return undefined;
  };


  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-dark-border rounded-md text-sm bg-dark-surface text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          style={{ colorScheme: 'dark' }}
        />
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
          </div>
        )}
        
        {/* Clear button */}
        {value && !isLoading && (
          <button
            onClick={() => {
              onChange('');
              setIsOpen(false);
              setSuggestions([]);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-300 hover:bg-dark-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                <div>
                  <div className="font-medium">
                    {suggestion.main_text}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {suggestion.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface ImageViewerModalProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

export default function ImageViewerModal({
  images,
  initialIndex = 0,
  visible,
  onClose,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  const renderImage = ({ item: uri }: { item: string }) => (
    <ScrollView
      style={{ width, height }}
      contentContainerStyle={styles.imageScrollContent}
      maximumZoomScale={6}
      minimumZoomScale={1}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      bouncesZoom
      centerContent
    >
      <Image
        source={{ uri }}
        style={styles.fullImage}
        resizeMode="contain"
      />
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#ffffff" />
        </TouchableOpacity>

        {/* Image counter */}
        {images.length > 1 && (
          <View style={[styles.counter, { top: insets.top + 16 }]}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}

        {/* Images */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />

        {/* Pagination dots */}
        {images.length > 1 && (
          <View style={[styles.pagination, { bottom: insets.bottom + 24 }]}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    zIndex: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  imageScrollContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width,
    height,
  },
  pagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#ffffff',
    width: 18,
    borderRadius: 3,
  },
});

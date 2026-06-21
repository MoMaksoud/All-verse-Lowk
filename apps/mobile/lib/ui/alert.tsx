import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Alert as RNAlert,
} from 'react-native';
import { colors } from '../../constants/theme';

/**
 * Themed in-app alert that matches the app UI (dark blue, clean) instead of the
 * white iOS/Android system dialog. Drop-in for React Native's Alert: import this
 * `Alert` instead of the one from 'react-native' and every `Alert.alert(...)`
 * call keeps working unchanged.
 */

export type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export interface AppAlertButton {
  text?: string;
  onPress?: () => void;
  style?: AppAlertButtonStyle;
}

interface AppAlertConfig {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

type Handler = (config: AppAlertConfig) => void;

// Module-level bridge so the imperative API can reach the mounted host.
let activeHandler: Handler | null = null;

function showAppAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
): void {
  const resolved: AppAlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];

  if (activeHandler) {
    activeHandler({ title, message, buttons: resolved });
  } else {
    // Host not mounted yet — fall back to the native dialog so nothing is lost.
    RNAlert.alert(
      title,
      message,
      resolved.map((b) => ({ text: b.text, onPress: b.onPress, style: b.style })),
    );
  }
}

/** Drop-in replacement for react-native's `Alert`. */
export const Alert = { alert: showAppAlert };

/**
 * Mount this once near the root (e.g. in _layout). It renders the themed dialog
 * on top of everything and registers the imperative handler.
 */
export function AlertHost() {
  const [config, setConfig] = useState<AppAlertConfig | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    activeHandler = (next) => setConfig(next);
    return () => {
      activeHandler = null;
    };
  }, []);

  useEffect(() => {
    if (config) {
      opacity.setValue(0);
      scale.setValue(0.96);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 9, tension: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [config, opacity, scale]);

  const dismiss = (button?: AppAlertButton) => {
    setConfig(null);
    if (button?.onPress) {
      // Defer so the modal can close first.
      requestAnimationFrame(() => button.onPress?.());
    }
  };

  const cancelButton = config?.buttons.find((b) => b.style === 'cancel');

  const handleBackdrop = () => {
    // Mirror iOS: backdrop only dismisses when there is an explicit cancel action.
    if (cancelButton) dismiss(cancelButton);
  };

  const buttons = config?.buttons ?? [];
  const isRow = buttons.length === 2;

  return (
    <Modal
      visible={!!config}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => dismiss(cancelButton)}
    >
      <TouchableWithoutFeedback onPress={handleBackdrop}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
              <Text style={styles.title}>{config?.title}</Text>
              {!!config?.message && <Text style={styles.message}>{config.message}</Text>}

              <View style={[styles.actions, isRow ? styles.actionsRow : styles.actionsCol]}>
                {buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  return (
                    <TouchableOpacity
                      key={`${button.text}-${index}`}
                      activeOpacity={0.8}
                      onPress={() => dismiss(button)}
                      style={[
                        styles.button,
                        isRow && styles.buttonRow,
                        isCancel
                          ? styles.buttonCancel
                          : isDestructive
                          ? styles.buttonDestructive
                          : styles.buttonDefault,
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isCancel
                            ? styles.buttonTextCancel
                            : isDestructive
                            ? styles.buttonTextDestructive
                            : styles.buttonTextDefault,
                        ]}
                        numberOfLines={1}
                      >
                        {button.text ?? 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bg.raised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actions: {
    marginTop: 22,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsCol: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flex: 1,
  },
  buttonDefault: {
    backgroundColor: colors.brand.DEFAULT,
  },
  buttonDestructive: {
    backgroundColor: colors.error.DEFAULT,
  },
  buttonCancel: {
    backgroundColor: colors.bg.surface,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonTextDefault: {
    color: colors.text.primary,
  },
  buttonTextDestructive: {
    color: colors.text.primary,
  },
  buttonTextCancel: {
    color: colors.text.secondary,
  },
});

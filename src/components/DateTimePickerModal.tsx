import MaterialCommunityIcon from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { Text, Button, Card, Portal } from 'react-native-paper';

import { colors, typography, spacing, shadows, components } from '../theme';

interface DateTimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: Date) => void;
  initialDate: Date;
}

const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialDate,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [mode, setMode] = useState<'date' | 'time'>('date');
  const [showNativePicker, setShowNativePicker] = useState(false);

  useEffect(() => {
    setSelectedDate(initialDate);
    // Reset picker state when modal opens/closes
    if (!visible) {
      setShowNativePicker(false);
    }
  }, [initialDate, visible]);

  const handleDateChange = (_event: any, selectedDateParam?: Date) => {
    if (Platform.OS === 'android') {
      setShowNativePicker(false);
    }
    if (selectedDateParam) {
      setSelectedDate(selectedDateParam);
    }
    // For iOS, we keep the picker open and let user tap Done
  };

  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  const showDatePicker = () => {
    setMode('date');
    setShowNativePicker(true);
  };

  const showTimePicker = () => {
    setMode('time');
    setShowNativePicker(true);
  };

  if (!visible) return null;

  return (
    <Portal>
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.modalContainer} onPress={() => {}}>
            <Card style={styles.pickerCard}>
              <Card.Content>
                <View style={styles.header}>
                  <MaterialCommunityIcon
                    name="calendar-clock"
                    size={24}
                    color={colors.primary}
                    style={styles.headerIcon}
                  />
                  <Text style={styles.title}>Select Date & Time</Text>
                </View>

                {Platform.OS === 'ios' && showNativePicker ? (
                  // iOS: Show picker inline within the modal
                  <View style={styles.inlinePickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode={mode}
                      is24Hour={true}
                      display="spinner"
                      onChange={handleDateChange}
                      style={styles.inlinePicker}
                      textColor={colors.text}
                    />
                    <View style={styles.pickerActions}>
                      <Button
                        mode="text"
                        onPress={() => setShowNativePicker(false)}
                        textColor={colors.textSecondary}
                      >
                        Done
                      </Button>
                    </View>
                  </View>
                ) : (
                  // Default view with date/time display and quick actions
                  <>
                    <View style={styles.dateTimeDisplay}>
                      <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeSection}>
                          <Text style={styles.sectionLabel}>Date</Text>
                          <Pressable
                            onPress={showDatePicker}
                            style={styles.dateTimeButton}
                          >
                            <MaterialCommunityIcon
                              name="calendar"
                              size={16}
                              color={colors.primary}
                              style={styles.buttonIcon}
                            />
                            <Text style={styles.dateTimeText}>
                              {selectedDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Text>
                          </Pressable>
                        </View>

                        <View style={styles.dateTimeSection}>
                          <Text style={styles.sectionLabel}>Time</Text>
                          <Pressable
                            onPress={showTimePicker}
                            style={styles.dateTimeButton}
                          >
                            <MaterialCommunityIcon
                              name="clock-outline"
                              size={16}
                              color={colors.primary}
                              style={styles.buttonIcon}
                            />
                            <Text style={styles.dateTimeText}>
                              {selectedDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <View style={styles.quickActionsContainer}>
                      <Text style={styles.quickActionsLabel}>Quick Actions</Text>
                      <View style={styles.quickActions}>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => {
                            const now = new Date();
                            now.setHours(now.getHours() + 1);
                            setSelectedDate(now);
                          }}
                        >
                          <Text style={styles.quickActionText}>In 1 hour</Text>
                        </Pressable>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(9, 0, 0, 0);
                            setSelectedDate(tomorrow);
                          }}
                        >
                          <Text style={styles.quickActionText}>Tomorrow 9 AM</Text>
                        </Pressable>
                        <Pressable
                          style={styles.quickActionButton}
                          onPress={() => {
                            const nextWeek = new Date();
                            nextWeek.setDate(nextWeek.getDate() + 7);
                            nextWeek.setHours(12, 0, 0, 0);
                            setSelectedDate(nextWeek);
                          }}
                        >
                          <Text style={styles.quickActionText}>Next week</Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}

                {/* Only show main action buttons when picker is not active on iOS */}
                {!(Platform.OS === 'ios' && showNativePicker) && (
                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      onPress={onClose}
                      style={styles.cancelButton}
                      textColor={colors.textSecondary}
                    >
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleConfirm}
                      style={styles.confirmButton}
                      icon={() => (
                        <MaterialCommunityIcon
                          name="check"
                          size={16}
                          color="white"
                        />
                      )}
                    >
                      Confirm
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>
          </Pressable>
        </Pressable>

        {/* Android native picker (shows outside modal) */}
        {Platform.OS === 'android' && showNativePicker && (
          <DateTimePicker
            value={selectedDate}
            mode={mode}
            is24Hour={true}
            display="default"
            onChange={handleDateChange}
          />
        )}
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: 20,
    ...shadows.large,
    borderWidth: 1,
    borderColor: colors.border,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  pickerCard: {
    backgroundColor: colors.surface,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  title: {
    ...typography.headlineSmall,
    color: colors.text,
    fontWeight: 'bold',
  },
  dateTimeDisplay: {
    marginBottom: spacing.lg,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  dateTimeSection: {
    flex: 1,
  },
  sectionLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  dateTimeText: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  quickActionsContainer: {
    marginBottom: spacing.lg,
  },
  quickActionsLabel: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  quickActionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    flex: 1,
    ...components.primaryButton,
  },
  inlinePickerContainer: {
    marginVertical: spacing.md,
    alignItems: 'center',
  },
  inlinePicker: {
    width: '100%',
    height: 200,
  },
  pickerActions: {
    alignItems: 'flex-end',
    width: '100%',
    marginTop: spacing.sm,
  },
});

export default DateTimePickerModal;

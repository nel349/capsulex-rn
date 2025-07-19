import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface ProgressStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
}

export function ProgressIndicator({ steps }: ProgressIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  step.completed && styles.stepCompleted,
                  step.current && styles.stepCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (step.completed || step.current) && styles.stepNumberActive,
                  ]}
                >
                  {step.completed ? '✓' : index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  (step.completed || step.current) && styles.stepTitleActive,
                ]}
              >
                {step.title}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.connector,
                  step.completed && styles.connectorCompleted,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCompleted: {
    backgroundColor: '#4caf50',
  },
  stepCurrent: {
    backgroundColor: '#2196f3',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
  },
  stepNumberActive: {
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#757575',
    fontWeight: '500',
  },
  stepTitleActive: {
    color: '#2196f3',
    fontWeight: '600',
  },
  connector: {
    height: 2,
    backgroundColor: '#e0e0e0',
    flex: 1,
    marginHorizontal: 8,
    marginBottom: 24,
  },
  connectorCompleted: {
    backgroundColor: '#4caf50',
  },
});

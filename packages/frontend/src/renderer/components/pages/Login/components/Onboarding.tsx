import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Container,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    label: 'Welcome to Banbury',
    description: "We're excited to have you here! Let's get you started with a quick tour.",
  },
  {
    label: 'Your Workspace',
    description: "This is where you'll manage your projects and collaborate with your team.",
  },
  {
    label: 'Ready to Go',
    description: "You're all set! Click finish to start using Banbury.",
  },
];

const StyledContainer = styled(Container)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(4),
}));

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      onComplete();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  return (
    <StyledContainer maxWidth="sm">
      <Stepper activeStep={activeStep} alternativeLabel sx={{ width: '100%', mb: 4 }}>
        {steps.map((step) => (
          <Step key={step.label}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Box sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {steps[activeStep].label}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {steps[activeStep].description}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
        >
          {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </Box>
    </StyledContainer>
  );
} 
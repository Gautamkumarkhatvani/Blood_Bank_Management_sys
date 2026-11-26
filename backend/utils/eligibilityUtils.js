export const calculateNextEligibilityDate = (lastDonationDate) => {
  const nextDate = new Date(lastDonationDate);
  nextDate.setDate(nextDate.getDate() + 90);
  return nextDate;
};

export const isEligibleToDonate = (lastDonationDate) => {
  if (!lastDonationDate) return true;
  
  const nextEligible = calculateNextEligibilityDate(lastDonationDate);
  return new Date() >= nextEligible;
};

export const daysUntilEligible = (lastDonationDate) => {
  if (!lastDonationDate) return 0;
  
  const nextEligible = calculateNextEligibilityDate(lastDonationDate);
  const today = new Date();
  const daysRemaining = Math.ceil((nextEligible - today) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysRemaining);
};

export const getEligibilityStatus = (donor) => {
  if (!donor.medicalVerified) {
    return {
      eligible: false,
      reason: 'Not medically verified',
      daysRemaining: 0
    };
  }

  if (donor.approvalStatus?.status !== 'approved') {
    return {
      eligible: false,
      reason: 'Not approved by admin',
      daysRemaining: 0
    };
  }

  if (donor.age < 18 || donor.age > 65) {
    return {
      eligible: false,
      reason: 'Age not in acceptable range',
      daysRemaining: 0
    };
  }

  if (donor.weight < 45) {
    return {
      eligible: false,
      reason: 'Weight must be at least 45kg',
      daysRemaining: 0
    };
  }

  if (!isEligibleToDonate(donor.lastDonationDate)) {
    const days = daysUntilEligible(donor.lastDonationDate);
    return {
      eligible: false,
      reason: `Wait ${days} more days before next donation`,
      daysRemaining: days
    };
  }

  return {
    eligible: true,
    reason: 'Eligible to donate',
    daysRemaining: 0
  };
};
module.exports = {
  WEIGHTS: {
    safety_risk: 0.35,
    service_impact: 0.25,
    affected_flats: 0.20, // Scaled against max ~100
    age: 0.10,            // Hours open
    repeat: 0.05,         // Recurring
    vulnerable: 0.05
  },
  THRESHOLDS: {
    Critical: 80,
    High: 60,
    Medium: 35,
    Low: 0
  },
  SLAS_HOURS: {
    Critical: 4,
    High: 24,
    Medium: 72,
    Low: 168
  },
  MAX_FLATS: 100,
  SAFETY_KEYWORDS: ['stuck', 'fire', 'smoke', 'gas leak', 'break-in', 'electric shock', 'flooding', 'danger', 'bleeding']
};

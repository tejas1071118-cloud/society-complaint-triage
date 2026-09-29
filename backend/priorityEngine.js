const config = require('./config/priority');

function calculatePriority(issue, complaintsCount, affectedFlatsCount, ageHours) {
  // If there's a manual override, respect it completely.
  // We'll calculate the score anyway to display it, but the priority_level will be preserved if overridden.

  // 1. Normalize components
  const safetyNorm = (issue.safety_risk || 0) * 10; // 0-10 to 0-100
  const impactNorm = (issue.service_impact || 0) * 10; // 0-10 to 0-100
  const flatsNorm = Math.min((affectedFlatsCount / 10) * 100, 100); // 10 flats is 100%
  const urgencyNorm = { Critical: 100, High: 75, Medium: 50, Low: 25 }[issue.urgency || 'Medium'] || 50;
  
  // Age normalization
  const sla = config.SLAS_HOURS[issue.urgency || 'Medium'];
  const ageNorm = Math.min((ageHours / sla) * 100, 100);

  const repeatNorm = issue.is_recurring ? 100 : 0;
  const vulnerableNorm = issue.vulnerable_residents ? 100 : 0;

  // 2. Base Score Calculation
  let score = 
      (0.40 * urgencyNorm) +
      (0.25 * safetyNorm) +
      (0.15 * impactNorm) +
      (0.10 * flatsNorm) +
      (0.05 * ageNorm) +
      (0.05 * vulnerableNorm);

  score = Math.round(score);

  // 3. Determine base level
  let priorityLevel = 'Low';
  if (score >= 60) priorityLevel = 'Critical';
  else if (score >= 40) priorityLevel = 'High';
  else if (score >= 25) priorityLevel = 'Medium';

  let overrideReason = '';

  // 4. Overrides for Critical
  const hasSafetyKeyword = config.SAFETY_KEYWORDS.some(k => 
    issue.reasoning?.toLowerCase().includes(k) || issue.category?.toLowerCase().includes(k)
  );

  if ((issue.safety_risk >= 8 || hasSafetyKeyword) && priorityLevel !== 'Critical') {
    priorityLevel = 'Critical';
    score = Math.max(score, 80); // Ensure score reflects critical
    overrideReason = 'Forced Critical (Safety Risk)';
  }

  // 5. Overdue escalation (SLA Breach)
  let isOverdue = false;
  if (issue.status === 'New' || issue.status === 'Assigned') {
      if (ageHours > sla) {
          isOverdue = true;
          // Escalate one level if overdue
          if (priorityLevel === 'Low') priorityLevel = 'Medium';
          else if (priorityLevel === 'Medium') priorityLevel = 'High';
          else if (priorityLevel === 'High') priorityLevel = 'Critical';
          overrideReason = overrideReason ? `${overrideReason}, Overdue` : `SLA Breached (> ${sla}h)`;
      }
  }

  // 6. Manual Override respect
  if (issue.manual_override_reason && issue.priority_level) {
      priorityLevel = issue.priority_level;
      // We don't change the underlying computed score, but the UI will respect the overridden priorityLevel.
  }

  return {
    score,
    priorityLevel,
    isOverdue,
    escalationReason: overrideReason
  };
}

module.exports = {
  calculatePriority
};

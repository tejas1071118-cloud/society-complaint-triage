require('dotenv').config();
const { tagComplaint } = require('./gemini');
const { calculatePriority } = require('./priorityEngine');

const samples = [
  { text: "Lift B is stuck between floors, two kids inside crying!", expected: "Critical" },
  { text: "Fire in the electrical panel of A wing!", expected: "Critical" },
  { text: "Lift band hai aur log stuck hain", expected: "Critical" },
  { text: "No water in entire B wing since morning", expected: "High" },
  { text: "B wing ka pani nahi aa raha since morning", expected: "High" },
  { text: "Main gate is open and guard is missing at night", expected: "High" },
  { text: "Loud music playing from 502, it's 1 AM", expected: "Medium" },
  { text: "Garbage not collected today from my flat C-404", expected: "Medium" },
  { text: "Kachra nahi uthaya bhai", expected: "Medium" },
  { text: "Someone parked in my slot again", expected: "Medium" },
  { text: "Gym AC is not cooling properly", expected: "Low" },
  { text: "Clubhouse paint is peeling off", expected: "Low" },
  { text: "Please add more flowering plants near the gate", expected: "Low" },
  { text: "Water leaking from ceiling in F-101, flooding my bedroom", expected: "Critical" },
  { text: "Smelling gas near the pipeline on 3rd floor", expected: "Critical" },
  { text: "My parking slot C-102 is blocked by MH02AB1234", expected: "Medium" },
  { text: "Dog barking continuously in D wing", expected: "Medium" },
  { text: "Staircase lights not working on 5th floor", expected: "Medium" },
  { text: "Security guard sleeping on duty", expected: "High" },
  { text: "Kids playing cricket in parking area, might break car glass", expected: "Medium" },
  { text: "Lift button not working on ground floor", expected: "Medium" },
  { text: "Pool water looks very dirty today", expected: "Medium" },
  { text: "Generator didn't start during power cut", expected: "High" },
  { text: "Tree branch fell on the boundary wall", expected: "Medium" },
  { text: "Need pest control in the basement", expected: "Low" },
  { text: "Basement mein bahut machhar hain", expected: "Low" },
  { text: "Electric shock from the gym treadmill", expected: "Critical" },
  { text: "Water pressure is very low in bathroom", expected: "Medium" },
  { text: "Cleaning staff didn't sweep the lobby", expected: "Low" },
  { text: "Lift fan making loud noise", expected: "Low" }
];

async function runEval() {
  let matches = 0;
  
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    console.log(`[Testing ${i+1}/30]: "${sample.text}"`);
    
    const aiResult = await tagComplaint(sample.text);
    
    // Convert tag result to a mock issue to test the priority engine
    const mockIssue = {
      safety_risk: aiResult.safety_risk,
      service_impact: aiResult.service_impact,
      vulnerable_residents: aiResult.vulnerable_residents ? 1 : 0,
      reasoning: aiResult.reasoning,
      category: aiResult.category,
      urgency_level: aiResult.urgency_level
    };

    // calculatePriority(issue, complaintsCount, affectedFlatsCount, ageHours)
    const { priorityLevel, score } = calculatePriority(mockIssue, 1, 1, 0);

    console.log(`  Expected: ${sample.expected} | Got: ${priorityLevel} (Score: ${score})`);
    
    if (priorityLevel === sample.expected) {
      matches++;
      console.log('  ✅ MATCH');
    } else {
      console.log(`  ❌ MISMATCH. AI reasoning: ${aiResult.reasoning} | Safety: ${aiResult.safety_risk} | Impact: ${aiResult.service_impact}`);
    }

    // Delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`n--- EVALUATION COMPLETE ---`);
  console.log(`Accuracy: ${matches}/${samples.length} (${((matches/samples.length)*100).toFixed(1)}%)`);
}

runEval();

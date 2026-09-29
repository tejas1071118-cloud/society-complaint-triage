require('dotenv').config();
const axios = require('axios');
const db = require('./db');

const complaints = [
  { flat: "A-101", name: "Rahul", text: "Lift B is stuck between floors, two kids inside crying!" },
  { flat: "A-102", name: "Simran", text: "Fire in the electrical panel of A wing!" },
  { flat: "A-103", name: "Vikram", text: "Lift band hai aur log stuck hain" },
  
  // 6 water complaints
  { flat: "B-201", name: "Amit", text: "No water in entire B wing since morning" },
  { flat: "B-202", name: "Neha", text: "B wing ka pani nahi aa raha since morning" },
  { flat: "B-203", name: "Raj", text: "Kitchen taps dry in B wing" },
  { flat: "B-204", name: "Priya", text: "No water in B wing" },
  { flat: "B-205", name: "Sunil", text: "B wing water supply stopped" },
  { flat: "B-206", name: "Suresh", text: "B wing no water" },

  { flat: "C-101", name: "Geeta", text: "Main gate is open and guard is missing at night" },
  { flat: "C-102", name: "Ramesh", text: "Loud music playing from 502, it's 1 AM" },
  { flat: "C-103", name: "Anil", text: "Garbage not collected today from my flat C-404" },
  { flat: "C-104", name: "Meena", text: "Kachra nahi uthaya bhai" },
  
  // Single parking
  { flat: "D-101", name: "Ravi", text: "Someone parked in my slot again" },
  
  { flat: "D-102", name: "Vivek", text: "Gym AC is not cooling properly" },
  { flat: "D-103", name: "Manoj", text: "Clubhouse paint is peeling off" },
  { flat: "D-104", name: "Simran", text: "Please add more flowering plants near the gate" },
  { flat: "E-101", name: "Rahul", text: "Water leaking from ceiling in F-101, flooding my bedroom" },
  { flat: "E-102", name: "Priya", text: "Smelling gas near the pipeline on 3rd floor" },
  { flat: "E-103", name: "Amit", text: "My parking slot C-102 is blocked by MH02AB1234" },
  { flat: "E-104", name: "Neha", text: "Dog barking continuously in D wing" },
  { flat: "F-101", name: "Sunil", text: "Staircase lights not working on 5th floor" },
  { flat: "F-102", name: "Riya", text: "Security guard sleeping on duty" },
  { flat: "F-103", name: "Anil", text: "Kids playing cricket in parking area, might break car glass" },
  { flat: "F-104", name: "Meena", text: "Lift button not working on ground floor" },
  { flat: "G-101", name: "Suresh", text: "Pool water looks very dirty today" },
  { flat: "G-102", name: "Ravi", text: "Generator didn't start during power cut" },
  { flat: "G-103", name: "Vikram", text: "Tree branch fell on the boundary wall" },
  { flat: "G-104", name: "Simran", text: "Need pest control in the basement" },
  { flat: "H-101", name: "Manoj", text: "Basement mein bahut machhar hain" },
  { flat: "H-102", name: "Geeta", text: "Electric shock from the gym treadmill" },
  { flat: "H-103", name: "Ramesh", text: "Water pressure is very low in bathroom" },
  { flat: "H-104", name: "Vivek", text: "Cleaning staff didn't sweep the lobby" },
  { flat: "I-101", name: "Rahul", text: "Lift fan making loud noise" }
];

async function seed() {
    console.log("Cleaning database...");
    db.prepare('DELETE FROM replies').run();
    db.prepare('DELETE FROM complaints').run();
    db.prepare('DELETE FROM issues').run();

    console.log("Seeding complaints for UI testing...");
    
    for (let i = 0; i < complaints.length; i++) {
        const c = complaints[i];
        console.log(`Sending complaint ${i+1}/${complaints.length}: ${c.text.substring(0, 30)}...`);
        try {
            await axios.post('http://localhost:3001/api/complaints', {
                flat_number: c.flat,
                name: c.name,
                description: c.text
            });
        } catch (err) {
            console.error("Failed to seed complaint:", err.message);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("Seeding complete!");
}

seed();

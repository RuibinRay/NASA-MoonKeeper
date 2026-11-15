// MOONKEEPER — one question after each kind of emergency, asked once per mission.
// In every entry the FIRST answer is the right one; the game shuffles them before showing.
// The other two are things people often believe. "why" is shown whichever answer was picked.
// Every fact here is one the game already uses; the sources are in docs/SCIENCE_AND_SOURCES.md.
export const QUIZ = {
  distress: {
    q: "You heard someone calling for help. What does bringing another astronaut home cost the station?",
    a: ["More air, water and food every day", "Nothing: one more person makes no difference", "Half of the solar panels"],
    why: "Every person breathes, drinks and eats. A rescued astronaut also brings a skill and a pair of hands. That is the rule of this place: no choice is free.",
  },
  storm: {
    q: "Why does going underground keep you safe in a solar storm?",
    a: ["Metres of rock overhead stop the radiation", "It is warmer underground", "Radiation cannot travel in the dark"],
    why: "A solar storm is a burst of fast particles from the Sun. Thick material stops them. A few metres of rock does what no spacesuit can.",
  },
  meteor: {
    q: "On Earth, small meteoroids burn up as shooting stars. Why do they reach the ground on the Moon?",
    a: ["The Moon has no air to burn them up", "The Moon pulls harder than Earth does", "The Moon is closer to the asteroids"],
    why: "Air is what heats a meteoroid until it burns away. The Moon has none, so even a grain of sand arrives at 20 kilometres a second or more.",
  },
  breach: {
    q: "A room has a hole in it. Why does locking its door save the other rooms?",
    a: ["Each room is its own sealed bubble of air", "The door pushes the lost air back in", "Air cannot move through a doorway"],
    why: "Air rushes toward empty space. A closed bulkhead door keeps the loss to one room. Real space stations are built in sealed sections for the same reason.",
  },
  dust: {
    q: "Why does dust on the solar panels matter?",
    a: ["It blocks sunlight, so the panels make less power", "It is heavy and bends the panels", "It makes the panels too cold to work"],
    why: "Moon dust is fine and sharp, and it clings by static electricity. A dusty panel gets less light, so it makes less electricity.",
  },
  quake: {
    q: "How do we know the Moon has quakes?",
    a: ["Apollo astronauts left instruments that recorded them", "We can watch the ground shake through telescopes", "Nobody knows: it is only a guess"],
    why: "Seismometers left by the Apollo crews listened from 1969 to 1977 and recorded thousands of events. Some shallow moonquakes shook for more than ten minutes.",
  },
  fire: {
    q: "What does a fire need to keep burning?",
    a: ["Fuel, heat and oxygen", "Only heat", "Gravity to pull the flames up"],
    why: "Take any one of the three away and the fire dies. Sealing a room starves the fire of oxygen. An extinguisher takes away heat and oxygen at once.",
  },
  co2: {
    q: "Why does the air in a sealed station have to be cleaned?",
    a: ["Breathing out adds carbon dioxide, and it builds up", "Oxygen goes sour after a day", "Old air wears out the machines"],
    why: "Each person breathes out about a kilogram of carbon dioxide a day. With nowhere to go it builds up, so a filter must take it out. The Apollo 13 crew built one by hand.",
  },
  mold: {
    q: "Why do fans help when mould starts on the plants?",
    a: ["Moving, drier air stops mould from growing", "Fans blow the mould out into space", "Plants need wind more than they need light"],
    why: "Mould grows where the air is damp and still. Flowers on the Space Station went mouldy in 2015 and were saved by turning the fans up.",
  },
  pump: {
    q: "The farm pump stopped. Why is that urgent for plants grown without soil?",
    a: ["Their roots have no soil to hold water, so they dry out in hours", "The plants become too heavy for the racks", "The lamps go out when the pump stops"],
    why: "In these racks the roots hang in flowing water. Soil would hold water for days. Here, no flow means no water.",
  },
  led: {
    q: "Why do the farms need lamps at all?",
    a: ["There is no sunlight underground, and plants need light to grow", "Lamps keep the plants warm, and light does not matter", "Lamps keep insects away"],
    why: "Plants make their food from light. Under the rock roof every crop grows under lamps, which is why farming costs electricity.",
  },
  seal: {
    q: "Why does the Water Plant need a tight seal?",
    a: ["The ice turns to vapour, and vapour escapes through any gap", "To keep moon dust out of the drinking water", "To keep the icy soil warm"],
    why: "In very low pressure, warmed ice turns straight into vapour without melting first. A leaky chamber lets that vapour escape before the cold trap can catch it.",
  },
  drift: {
    q: "Why does a message to Earth take 1.3 seconds to arrive?",
    a: ["Radio travels at the speed of light, and Earth is 384,400 km away", "The radio needs time to warm up", "Earth's air slows the signal down"],
    why: "Nothing travels faster than light, and radio is a kind of light. Even at that speed the trip to Earth takes 1.3 seconds, and the answer takes 1.3 more.",
  },
  freeze: {
    q: "Why do machines on the surface need heaters at night?",
    a: ["With no air to hold warmth, the ground falls to about −173°C", "The night wind chills them", "Their batteries make them cold"],
    why: "There is no air on the Moon, so there is no wind and nothing to keep the day's warmth. After sunset the surface falls to about −173°C, cold enough to crack metal and electronics.",
  },
};

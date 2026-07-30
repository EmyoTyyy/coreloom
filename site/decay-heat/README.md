# Decay Heat

A night shift in the control room of a four-loop, 3400 MWt pressurised water reactor.

You sit in a chair in the middle of a horseshoe of analogue panels. You cannot see all of
them at once, so you turn your head, and while you are looking at one board the others are
still doing things. You are graded on safety and on money, and they pull against each other.
Tripping the reactor is always the safe move; it also costs a fortune and buys a day of
xenon-poisoned downtime.

Faults cascade out of the physics rather than out of a script. Nothing in here is waiting to
get you. The plant is indifferent, it is very large, and it does exactly what physics says
it will.

Plays in **English or French**, panel engraving included. 

Plain HTML, CSS and JavaScript. No build step, no dependencies, no third-party requests at
runtime, every path relative. Opens straight off the disk from `file://`.

**Wants a real screen and a keyboard.** Most of the controls are keys, and the panels are
laid out to be panned across a wide window. It will render on a phone and it will not be
worth playing on one.

### ▶ [Play it in your browser](https://emyotyyy.github.io/emyot.fun/decay-heat/)

---

## Playing

| key | |
|---|---|
| `A` `D` or `←` `→` | turn your head. Panning is eased and takes time; that is the point |
| mouse near a screen edge | same, proportional to how far over you are |
| click | operate a switch. Hold the momentary ones (rods, charging, load demand) |
| click the desk | pick up a tool. Each one opens the pane its shortcut does |
| `TAB` | raise and lower the CCTV monitor. While it is up you cannot see the panels |
| `1`–`6` (monitor up) | select a camera |
| `E` | acknowledge the annunciator |
| `B` | procedure binder |
| `C` | strip chart recorder |
| `T` | telephone — dispatcher, and the field operator |
| `F` | torch. It adds light the room has stopped providing, so it does nothing until the room lighting fails |
| `EN` / `FR` | language. English and French, including the panel engraving. |
| `1` `2` `3` `4` | 1× / 10× / 60× / 600× |
| `space` | pause |
| `Esc` | back out of whatever is open, then to the menu |

The camera sits back far enough to see about two and a half of the five boards at once, with
ceiling above the panels and desk in front of you. `VIEW_W`, `VIEW_W_MAX` and `FILL` at the top
of `js/ui/room.js` decide that, and they are a legibility control as much as a compositional
one: back the camera off and the engraving on the panels stops being readable. Panel type is
sized in panorama units from the scale in `js/ui/gauges.js`, and nothing on a board is allowed
to shrink below the floor that survives it.

The whole room is rendered flat and then re-blitted through a shallow barrel curve, as if you
were watching it on a camera. `BOW` in `js/ui/room.js` sets how much — it is a direct trade
against sharpness, since the curve is what resamples the type.

Each board is a vertical face carrying instruments in three rows over a bench carrying the
controls, split at `LIP`, and divides its width into columns of `COL` — one per loop, one per
steam generator. Those constants are at the top of `js/ui/boards.js`.

A red chevron at the screen edge points toward any board with an unacknowledged alarm. You
always know *that* something happened and roughly *where*. You have to go and look to find
out *what*.

### Your desk

The shift opens looking at your own station, and everything on it works. Left to right: the
**flashlight**, the **procedure binder**, the **plant phone**, a **mug of coffee**, the **strip
chart recorder**, and the **camera terminal**. Click any of them for the pane its keyboard
shortcut opens — they are the same thing, routed through the same handler.

They are also alive while you are not using them. The phone's line lamp flashes when the
dispatcher wants you. The recorder's paper shows the power trace it has actually logged, so you
can read the trend without opening anything. The terminal wakes up and shows which of the six
cameras is selected. The flashlight's thumb slide sits forward when it is lit.

The mug is the one thing you cannot open, and it earns its place anyway: the coffee ripples to
the same shake the room does, so a turbine letting go registers on your desk a moment before
you have found the alarm that says so. It also goes cold over the first stretch of the shift.

The desk runs at a nearer parallax than the console, so it slides faster than the panels behind
it. The far boards get paperwork and abandoned cups rather than tools — what you need lives
where you sit, and a pan is the price of picking it up.

The **PANEL** tab of the procedure binder describes every instrument and every control on all
five boards, with the setpoints. It is one keystroke away at any time.

Time acceleration drops to 1× automatically on any new alarm, and is clamped while you are
holding a rod control. Xenon plays out over nine hours and Doppler feedback over
milliseconds, so the compression is not a convenience.

---

## What is actually simulated

A basic-principles model of the kind used in operator training simulators: point kinetics
plus lumped thermal nodes, about twenty state variables, integrated at a fixed 20 ms step
decoupled from rendering. **It is not a 3D neutronics code.** There is no spatial flux
solution, no subchannel thermal-hydraulics, and the axial offset is a lagged correlation
rather than a real axial xenon calculation.

Within those limits the numbers are honest:

**Neutronics.** Point kinetics with six delayed groups (λ = 0.0124 … 3.01 s⁻¹),
Λ = 2×10⁻⁵ s, β = 650 pcm falling toward 500 pcm as Pu-239 builds in over the cycle. That Λ
makes the system very stiff. Normal operation uses the prompt-jump approximation, which is
where it is most accurate; on approach to prompt critical the solver switches to adaptively
sub-stepped implicit integration with the fuel node integrated *inside* the sub-steps, so
Doppler can terminate an excursion the way it does in reality. A +700 pcm rod ejection peaks
at about 25× power roughly 40 ms in and is over before a human could react to it.

**Reactivity.** Rods, boron, Doppler (−2.5 pcm/°C), moderator, xenon and samarium.
The moderator and boron terms both run off water density rather than a fixed coefficient,
which is what makes the moderator coefficient come out at about −28 pcm/°C at full power and
go *positive* at beginning of cycle with high boron — a real condition, and it falls out of
the model rather than being special-cased.

**Xenon-135.** Iodine and xenon with the real yields and cross-section. After a trip from
full power, xenon keeps climbing for another nine and a half hours, peaks at about 2.8× its
equilibrium worth (−7500 pcm), and can exceed the rod worth available to you entirely.

**Decay heat.** A 24-group exponential expansion of the Wigner-Way curve, so it responds to
any power history rather than needing a shutdown timestamp. It tracks the analytic curve
within about 3% from one second to ten days: 6.0% of rated at 1 s, 1.19% at 1 h, 0.62% at
24 h. One-point-two percent of 3400 MW is 41 megawatts with the reactor off. That is the
title.

**Thermal-hydraulics.** Fuel, clad and coolant nodes; four loops with pump coastdown and
buoyancy-driven natural circulation; a two-region pressurizer with heaters, spray, PORVs and
code safeties; four steam generators with shrink and swell, feedwater control, turbine
demand, steam dump and atmospheric reliefs. Water properties come from the IAPWS-IF97
saturation equations plus interpolated tables. The parameter you live by is subcooling
margin, and it has the largest readout on the Primary board.

### Instruments that lie

The model simulates *the instrument*, not the quantity, so the deception is free:

- **Level is a differential pressure measurement** against a water-filled reference leg. Heat
  the leg and its water gets less dense; drop the pressure below saturation for the leg
  temperature and it flashes to steam. Either way indicated level reads **high while the
  vessel is emptying**. Three Mile Island's operators were reading the gauge correctly.
- **A stuck-open relief valve looks like a leak somewhere downstream**, while the pressurizer
  can read full, because water is leaving out of the top.
- **Thermocouples lag** about five seconds. In a fast transient you are looking at the recent
  past.
- **Narrow and wide range disagree** near the edges of their spans.
- **Boron is a laboratory sample**, not a live reading. The board shows the last sample and
  how old it is.

The protection system reads the same indicated values you do. If an instrument lies to you,
it lies to the trip logic too.

Diagnosis comes from trends and from noticing which instruments disagree with each other,
never from one number. That is what the strip chart recorder is for.

---

## Scenarios

Fourteen, each with a par. Each is data — initial state, a schedule of plant faults, grid
demand, phone calls and thresholds — in its own file under `js/scenarios/`.

| # | | teaches |
|---|---|---|
| 0 | Console checkout | Where everything is, and what the panes behind the panels are for |
| 1 | Startup | Subcritical multiplication, doubling time, startup rate |
| 2 | Power ascension | The temperature programme, with xenon building underneath you |
| 3 | Load follow | The xenon lesson, learned painfully |
| 4 | Clean trip | The baseline. Where forty megawatts goes with the reactor off |
| 5 | Loss of feedwater | The heat sink, and how fast a generator boils dry |
| 6 | Loss of feedwater, valves shut | The actual opening of Three Mile Island |
| 7 | Stuck-open PORV | The rest of it. Subcooling margin is the only honest tell |
| 8 | Small-break LOCA | Diagnosis by elimination |
| 9 | Steam generator tube rupture | The correct response feels wrong |
| 10 | Station blackout | Fukushima's shape. Where the flashlight earns its place |
| 11 | Xenon-precluded startup | Recognising that the answer is no |
| 12 | Rod ejection | Doppler is faster than any human being |
| 13 | ATWS | Boron, and the moderator coefficient you were given |

Scenario 0 is a guided walkthrough rather than a shift. It runs on the same plant as
everything else — the steps that break something call `DH.Plant.act` exactly as a click on the
panel would, and the steps that wait for you read the same state the panels read. It ends by
taking the grid away from you, which is when the torch stops being a dead button.

Scenario 3 is the one to play first after that, if you only play one.

---

## The field operator

You have one auxiliary operator and a telephone. He takes three to six minutes of simulated
time to walk anywhere, you can watch him on CCTV, and he reports back by phone. **Manual
valve operations exist only through him** — anything not motor-operated from the control room
needs a person standing next to it.

This is what makes scenario 6 honest. The closed auxiliary feedwater valves are discoverable,
but discovering them costs minutes you may not have.

---

## Scoring and replay

Safety and economics are scored separately and shown separately, because they conflict.

Safety counts peak clad and fuel centreline temperature, whether the core stayed covered,
time with the core saturated, radioactivity released, peak containment pressure, coolant
inventory lost, and time in violation of technical specifications. Economics counts
megawatt-hours against the shift's par, with a penalty for generating power the grid did not
ask for and a heavy one for an avoidable trip.

Every run is deterministic — seed plus timestamped input events — so the debrief gives you a
scrubbable timeline of every parameter with your own actions marked on it, and you can find
the exact moment it got away from you. As with Coreloom's cycle par, the second run is the
real game.

Best scores persist in `localStorage` under the single key **`decayheat.v1`**
(`{ best: { <scenarioId>: { grade, total, safety, econ } }, mute }`). Storage being blocked
degrades to not remembering anything; nothing else breaks.

---

## Sound

Synthesised with WebAudio, apart from the flashlight, which is a recording of a real switch.
Mechanical sounds are noise transients shaped by a resonant body rather than tones — an
oscillator makes a beep no matter how short you cut it.

The reactor coolant pump hum tracks how many of the four are running, and **the hum changing is
a diagnostic event** — you hear a pump trip before you see it. Plus ventilation, a per-alarm
annunciator buzzer that goes steady when acknowledged, a breaker clunk and a minute-long
turbine coastdown on a trip, a safety injection klaxon, and the phone. `M` mutes, and the
setting persists.

---

## Layout

```
decay-heat/
  index.html
  css/
    room.css          panorama, parallax, lighting states, interface chrome
    panels.css        instrument palette — every colour on a panel comes from here
  js/
    sim/
      steam.js        IAPWS-IF97 saturation, water and steam property tables
      kinetics.js     point kinetics, delayed groups, prompt-jump / implicit switching
      reactivity.js   rods, boron, Doppler, moderator, xenon, samarium
      xenon.js        I-135 / Xe-135 / Pm-149 / Sm-149
      thermal.js      fuel, clad, coolant, pressurizer, steam generators
      decay.js        decay heat
      plant.js        assembles the above, systems, trips, alarms, one step()
      instruments.js  true state to indicated value: lag, noise and the lies
    scenarios/*.js    one file per scenario, pure data
    i18n.js           the string table, as [english, français] pairs
    i18n-text.js      shift briefings
    i18n-doc.js       procedure binder, panel description, checkout script
    ui/
      room.js         panorama, pan, parallax, lighting, flashlight, hit testing
      desk.js         the desk and the things on it, and what picking one up does
      gauges.js       needles, bargraphs, log meters, switches, lamps
      boards.js       the five boards: what is on them and what it does
      annunciator.js  tiles, alarm queue, acknowledge, edge chevrons
      monitor.js      CCTV overlay
      binder.js       procedures
      phone.js        dispatcher calls and field operator dispatch
      chart.js        strip recorder
      replay.js       scoring and the timeline scrubber
    audio.js          WebAudio synthesis, plus the one sampled sound
    main.js           boot, time control, loop, persistence
  assets/             generated webp and one recorded switch, 550 kB total
```

The plant is a **four**-loop unit — four pumps, four generators. The brief specified four
reactor coolant pumps and three steam generators, which is not a plant that exists; 3400 MWt
and 1150 MWe is a four-loop Westinghouse, so the count went to four.

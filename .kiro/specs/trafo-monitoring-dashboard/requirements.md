# Requirements Document

## Introduction

The Trafo Monitoring Dashboard is a redesign of the LeakGuard web application's main page. Instead of a generic device table, the dashboard presents three transformer units (Trafo 1, 2, 3) as dedicated cards arranged side-by-side. Each card visualises the three phases (R, S, T) of leak current using circular SVG gauges, shows live Ampere values, and provides a per-transformer trend chart of the last 50 readings. Users can rename transformers inline, configure warning thresholds, and see a summary table aggregating all phase values. Data is sourced from the existing `sensor_readings` Supabase table and streamed in real-time via Supabase Realtime subscriptions.

---

## Glossary

- **Dashboard**: The main page (`/`) of the LeakGuard web application.
- **Trafo**: Abbreviation for transformer (*transformator* in Indonesian). The system monitors three transformers: Trafo 1, Trafo 2, Trafo 3.
- **Phase**: One of three electrical phases labelled R, S, or T measured on each transformer.
- **Gauge**: A circular SVG arc that visually represents a measured value relative to a threshold.
- **Threshold**: A configurable Ampere value above which a reading is considered a Warning. Default is 0.1 A.
- **sensor_readings**: The Supabase database table that stores leak-current readings per device.
- **Channel Mapping**: The assignment of `sensor_readings` columns to Trafo/Phase combinations (see Requirement 2).
- **Trend Chart**: A line chart displaying the last 50 readings for a given transformer over time.
- **Status Bar**: A horizontal bar at the top of the dashboard showing device metadata and a live indicator.
- **Summary Table**: A tabular view below the transformer cards showing R, S, T values for all three trafos in one place.
- **Inline Edit**: A UI interaction where clicking a text label replaces it with an input field for editing.
- **LocalStorage**: Browser-side key-value storage used to persist transformer names and threshold configuration across sessions.
- **Supabase_Client**: The singleton Supabase JavaScript client defined in `lib/supabase.ts`.
- **Realtime_Subscription**: A Supabase Postgres Changes subscription that triggers UI updates on new `INSERT` events.

---

## Requirements

### Requirement 1: Transformer Card Layout

**User Story:** As a monitoring engineer, I want to see all three transformers displayed side-by-side as cards, so that I can compare their status at a glance without scrolling.

#### Acceptance Criteria

1. THE Dashboard SHALL render exactly three transformer cards (Trafo 1, Trafo 2, Trafo 3) in a single horizontal row on screens wider than 768 px.
2. WHEN the viewport width is less than 768 px, THE Dashboard SHALL stack the transformer cards vertically.
3. THE Dashboard SHALL display each transformer card with a clearly visible card title identifying the transformer (e.g., "Trafo 1").
4. WHEN no sensor data has been received for a transformer, THE Dashboard SHALL display a placeholder state within the card indicating data is unavailable.

---

### Requirement 2: Channel-to-Trafo-Phase Mapping

**User Story:** As a system integrator, I want the dashboard to correctly map database columns to transformer phases, so that each gauge and value reflects the right physical measurement.

#### Acceptance Criteria

1. THE Dashboard SHALL map `ch1_mA` to Trafo 1 Phase R, `ch4_mA` to Trafo 1 Phase S, and `ch7_mA` to Trafo 1 Phase T.
2. THE Dashboard SHALL map `ch2_mA` to Trafo 2 Phase R, `ch5_mA` to Trafo 2 Phase S, and `ch8_mA` to Trafo 2 Phase T.
3. THE Dashboard SHALL map `ch3_mA` to Trafo 3 Phase R, `ch6_mA` to Trafo 3 Phase S, and `ch9_mA` to Trafo 3 Phase T.
4. THE Dashboard SHALL map `base1_mA`, `base4_mA`, `base7_mA` as the baseline references for Trafo 1 phases R, S, T respectively.
5. THE Dashboard SHALL map `base2_mA`, `base5_mA`, `base8_mA` as the baseline references for Trafo 2 phases R, S, T respectively.
6. THE Dashboard SHALL map `base3_mA`, `base6_mA`, `base9_mA` as the baseline references for Trafo 3 phases R, S, T respectively.
7. THE Dashboard SHALL treat all `ch*_mA` and `base*_mA` values as Amperes (A) regardless of the column name suffix.

---

### Requirement 3: Phase Gauges

**User Story:** As a monitoring engineer, I want to see circular gauges for each phase on a transformer card, so that I can instantly assess the current level relative to the warning threshold.

#### Acceptance Criteria

1. WHEN a sensor reading is available, THE Dashboard SHALL render one circular SVG gauge per phase (R, S, T) inside each transformer card — three gauges per card, nine gauges total.
2. THE Gauge SHALL display the current phase value in Amperes formatted to four decimal places (e.g., `0.0342 A`).
3. THE Gauge SHALL visually fill its arc proportionally to the ratio of the current value divided by the active warning threshold, capped at 100 %.
4. WHEN the current phase value is below the active warning threshold, THE Gauge SHALL render its arc in a green colour.
5. WHEN the current phase value is at or above the active warning threshold, THE Gauge SHALL render its arc in a yellow or amber colour.
6. THE Gauge SHALL display the phase label (R, S, or T) within or adjacent to the gauge circle.

---

### Requirement 4: Status Determination

**User Story:** As a monitoring engineer, I want each phase and transformer to have a clearly computed status, so that I can act on warnings without ambiguity.

#### Acceptance Criteria

1. WHEN a phase value is strictly less than the active warning threshold, THE Dashboard SHALL assign status "Normal" to that phase.
2. WHEN a phase value is greater than or equal to the active warning threshold, THE Dashboard SHALL assign status "Warning" to that phase.
3. WHEN all three phases of a transformer are "Normal", THE Dashboard SHALL assign overall status "Normal" to that transformer card.
4. WHEN at least one phase of a transformer is "Warning", THE Dashboard SHALL assign overall status "Warning" to that transformer card.
5. THE Dashboard SHALL display the overall transformer status visibly on the transformer card header.

---

### Requirement 5: Warning Threshold Configuration

**User Story:** As a monitoring engineer, I want to configure the warning threshold, so that I can tune alert sensitivity without modifying code.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a settings panel accessible from the main page that allows the user to input a numeric warning threshold value in Amperes.
2. WHEN the user saves a new threshold value, THE Dashboard SHALL persist the value to the browser's localStorage under a defined key.
3. WHEN the Dashboard loads, THE Dashboard SHALL read the threshold from localStorage and apply it as the active threshold.
4. IF no threshold is found in localStorage, THEN THE Dashboard SHALL apply a default threshold of 0.1 A.
5. WHEN the threshold changes, THE Dashboard SHALL immediately re-evaluate the status of all displayed phase values without requiring a page reload.
6. THE Dashboard SHALL reject threshold inputs that are not positive numbers and display an inline validation error.

---

### Requirement 6: Inline Transformer Name Editing

**User Story:** As a monitoring engineer, I want to rename transformers directly on the dashboard, so that I can use site-specific labels without developer involvement.

#### Acceptance Criteria

1. WHEN a user clicks the transformer name label on a card, THE Dashboard SHALL replace the label with an editable text input pre-filled with the current name.
2. WHEN the user presses Enter or clicks away from the input field, THE Dashboard SHALL save the new name and revert to the label display.
3. WHEN a transformer name is saved, THE Dashboard SHALL persist the name to localStorage keyed by transformer index (1, 2, or 3).
4. WHEN the Dashboard loads, THE Dashboard SHALL retrieve stored names from localStorage and display them in place of the default names.
5. IF localStorage contains no name for a transformer, THEN THE Dashboard SHALL display the default name ("Trafo 1", "Trafo 2", or "Trafo 3").
6. THE Dashboard SHALL not allow an empty string as a transformer name; IF the user submits an empty input, THEN THE Dashboard SHALL revert to the previous name.

---

### Requirement 7: Trend Chart

**User Story:** As a monitoring engineer, I want to see a trend chart of recent readings per transformer, so that I can identify patterns and anomalies over time.

#### Acceptance Criteria

1. WHEN sensor data is available, THE Dashboard SHALL render one trend chart per transformer card displaying the last 50 readings for all three phases (R, S, T) as separate lines.
2. THE Trend_Chart SHALL use the Recharts library already available in the project.
3. THE Trend_Chart SHALL display time on the X-axis and Ampere values on the Y-axis.
4. THE Trend_Chart SHALL use distinct colours for each phase line (R, S, T) with a legend.
5. WHEN a new reading arrives via Realtime_Subscription, THE Trend_Chart SHALL update to include the new data point and drop the oldest if the series exceeds 50 readings.
6. THE Trend_Chart SHALL format Y-axis tick values to four decimal places.

---

### Requirement 8: Realtime Updates

**User Story:** As a monitoring engineer, I want the dashboard to update automatically when new sensor data arrives, so that I always see the current state without manual refresh.

#### Acceptance Criteria

1. WHEN the Dashboard mounts, THE Dashboard SHALL establish a Realtime_Subscription to the `sensor_readings` table for `INSERT` events using Supabase_Client.
2. WHEN a new row is inserted into `sensor_readings`, THE Dashboard SHALL update the displayed gauge values, transformer status, and trend data without a full page reload.
3. WHEN the Dashboard unmounts, THE Dashboard SHALL remove the Realtime_Subscription to prevent memory leaks.
4. THE Dashboard SHALL display a live indicator (e.g., a pulsing dot) in the Status Bar when the Realtime_Subscription is active and connected.
5. IF the Realtime_Subscription encounters a connection error, THEN THE Dashboard SHALL display a disconnected state on the live indicator.

---

### Requirement 9: System Status Bar

**User Story:** As a monitoring engineer, I want a status bar showing device metadata and a live indicator, so that I can confirm which device I am monitoring and that the data stream is active.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Status Bar at the top of the page containing the device ID of the monitored device.
2. THE Status Bar SHALL display the device type and location fields from the `devices` table when available.
3. THE Status Bar SHALL include a live indicator that reflects the state of the Realtime_Subscription (connected or disconnected).
4. THE Status Bar SHALL display the timestamp of the most recently received sensor reading formatted as a human-readable date and time.
5. WHEN no data has been received, THE Status Bar SHALL display a "No data yet" placeholder for the last-update timestamp.

---

### Requirement 10: Summary Table

**User Story:** As a monitoring engineer, I want a summary table below the transformer cards, so that I can quickly compare exact phase values across all three transformers in a structured format.

#### Acceptance Criteria

1. THE Dashboard SHALL render a summary table below the transformer cards with one row per transformer (Trafo 1, Trafo 2, Trafo 3).
2. THE Summary_Table SHALL include columns for: Transformer Name, Phase R value (A), Phase S value (A), Phase T value (A), and Overall Status.
3. THE Summary_Table SHALL display values formatted to four decimal places.
4. WHEN a phase value is "Warning" status, THE Summary_Table SHALL apply a visual highlight (e.g., yellow background or coloured text) to that cell.
5. WHEN transformer names are changed via inline edit, THE Summary_Table SHALL reflect the updated names immediately.
6. WHEN new data arrives via Realtime_Subscription, THE Summary_Table SHALL update its displayed values without a page reload.

---

### Requirement 11: Initial Data Load

**User Story:** As a monitoring engineer, I want the dashboard to load the latest sensor data on page open, so that I see current values immediately without waiting for the next realtime event.

#### Acceptance Criteria

1. WHEN the Dashboard mounts, THE Dashboard SHALL fetch the single most recent row from `sensor_readings` for the active device from Supabase and populate all gauges, the trend chart seed data, and the summary table.
2. THE Dashboard SHALL fetch the last 50 rows from `sensor_readings` ordered by `timestamp` descending to seed the trend chart history.
3. WHEN the initial data fetch is in progress, THE Dashboard SHALL display a loading indicator.
4. IF the initial data fetch returns an error, THEN THE Dashboard SHALL display an error message and provide a retry action.
5. THE Dashboard SHALL also fetch device metadata from the `devices` table on mount to populate the Status Bar.

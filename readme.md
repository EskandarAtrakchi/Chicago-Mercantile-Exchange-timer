# CME Bitcoin Futures Countdown Clock (Dublin)

This project provides a simple **countdown clock** that shows the status of the **CME Bitcoin Futures market** and the time remaining until its next transition (open, close, or daily break). All times are automatically converted and displayed in **Europe/Dublin (IST)**.

---

## Features
- Displays **current CME market status**: OPEN, CLOSED (weekend), or DAILY BREAK.
- Shows a **live countdown timer** (days, hours, minutes, seconds) until the next market transition.
- Displays the **target transition time** in **Dublin local time**.
- Includes quick action buttons:
  - **Refresh** to update immediately.
  - **Copy Dublin Time** to copy the next transition time to clipboard.
- Uses Luxon (timezone-aware JavaScript library) for reliable time calculations.
- Clean, responsive UI with dark gradient styling.

---

## CME Schedule Used
- **Opens**: Sunday at 18:00 ET (23:00 Dublin)
- **Closes**: Friday at 17:00 ET (22:00 Dublin)
- **Daily Break**: 17:00–18:00 ET (22:00–23:00 Dublin)

Note: Unlike crypto spot markets (which trade 24/7), **CME Bitcoin Futures are not open on weekends**, which causes the well-known **CME gaps**.

---

## How to Run
1. Download or copy the HTML file from this project.
2. Open it in any modern browser (Chrome, Firefox, Edge, Safari).
3. The clock will start automatically and refresh every second.

---

## Dependencies
- [Luxon](https://moment.github.io/luxon/) (CDN loaded) for time zone and date handling.

---

## Customization
- Change `DUB = 'Europe/Dublin'` in the script to display times in another time zone.
- Update CSS in the `<style>` section to modify the theme.

---

## Example Use Cases
- Traders in Dublin (or similar time zones) who want a **clear view of CME futures trading hours**.
- Crypto traders tracking **CME gaps**.
- General educational tool to understand the difference between CME and 24/7 crypto markets.

---

## License
This project is open source and free to use for personal or educational purposes.

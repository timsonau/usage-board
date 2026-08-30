# Usage Board

A desktop widget that shows how close a Claude Code account is to its usage limits, via a mascot whose pose reacts to how close each usage window is to running out.

## Language

**Nibble**:
The cat mascot rendered on the widget. Its pose (ear position, tail swing, blink) reflects the overall Mood.
_Avoid_: sprite, character (except when referring to the pixel-art rendering itself, not the concept).

**Usage window**:
A rolling period Anthropic tracks usage against. There are two: the 5-hour session window and the 7-day weekly window. Each has its own percentage-used and reset time.
_Avoid_: session (ambiguous with the 5h window specifically), period.

**Mood**:
The tier a percentage-used falls into: calm, busy, anxious, or critical (plus waiting, before any usage data has arrived). The boundaries are fixed at 50%/85%/100%, chosen to match Anthropic's own alert thresholds. Each usage window has its own Mood; Nibble's overall Mood is the more severe of the two.
_Avoid_: status, tier, level, alert.

**Widget**:
The whole on-screen unit: Nibble plus the two usage windows' bars, percentages, and reset countdowns. One widget, driven by one usage update at a time.
_Avoid_: app, dashboard.

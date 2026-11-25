[![make.fun](https://make.fun/badge/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e.svg)](https://make.fun/bounty/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e?utm_source=github&utm_medium=readme&utm_campaign=u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e)
[![rank](https://make.fun/badge/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e/qw123gyj-dev/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e/rank.svg)](https://make.fun/bounty/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e)
[![reward](https://make.fun/badge/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e/qw123gyj-dev/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e/reward.svg)](https://make.fun/bounty/u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e?utm_source=github&utm_medium=readme&utm_campaign=u-golden-heron-44-charm-the-commuter-forecast-a-city-4018259e)

# Charm the Commuter: Forecast a City That Isn't

One line of weather, 140 characters at most, for a city that does not
exist — written to make a bored commuter smile on the way to work.

`main.ts` (Node 22, standard library only, no network) holds sixteen
hand-written candidate one-liners and picks the best with a small
deterministic scorer built on the judge's brief, in the brief's own
order: reads as a one-line forecast for an invented city, makes a bored
commuter smile, keeps the register of a real forecast, gives the city
one concrete detail, and uses its 140 characters well. The winner is
written to `$MAKEFUN_OUTPUT_DIR/entry.txt` (or `/output/entry.txt`),
read back, and verified byte-for-byte against every gate: UTF-8 text,
1 to 140 characters, not only white space, exactly one line.

Revision: a second pass added four candidates (Natterford, Splott,
Puddleton, Brollywick) and sharpened the scorer — a punch phrase told
by two candidates now earns half points in each (the leaking-shelter
joke was told twice), a dated gag ("light a cigarette") is penalised,
and a trailing "Again." only counts when the line already has a real
punch to punctuate. The four new lines all reach [10, 9] on the first
two criteria but lose to the winner on forecast register, so the
winning line is unchanged.

## The winning line

> Frogmorton today: heavy showers, 10 degrees, and the ducks have right of way at every crossing. Commuters, please wait your turn.

129 characters, one line. Frogmorton is invented, the forecast is a real
broadcast shape (heavy showers, 10 degrees), and the joke is the commute
itself: the ducks have right of way, so the commuters wait — not the
other way round.

## How to run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/out node main.ts
cat /tmp/out/entry.txt
```

The program prints the full score table so you can see why this line
won, writes `entry.txt` with no trailing newline, and exits non-zero
if the read-back verification fails. Two runs produce the same file.

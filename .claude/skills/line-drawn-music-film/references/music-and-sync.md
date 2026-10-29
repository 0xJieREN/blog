# Music: sources, excerpts and timing the film to the recording

## Finding a recording you may use

Prefer recordings that are public domain / CC0 so the film can be posted anywhere:

- **Kimiko Ishizaka**, *Open Goldberg Variations* (2012) and *Open Well-Tempered Clavier*, CC0.
  archive.org item `OpenGoldbergVariations` has flac/mp3/ogg per track:
  `curl https://archive.org/metadata/OpenGoldbergVariations` lists files;
  download `https://archive.org/download/<item>/<file name, url-encoded>`.
- **Musopen** (musopen.org) public-domain recordings; Wikimedia Commons audio
  (`commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=...`).
- archive.org `advancedsearch.php?q=<terms>&fl[]=identifier&fl[]=licenseurl&output=json` shows
  licences directly.

upload.wikimedia.org rate-limits shared egress IPs (HTTP 429 even with a proper User-Agent).
When that happens, look for the same recording on archive.org instead of retrying.

## Finding the score

Notes on the staff should be the real notes, not decoration. Get a MIDI of the piece:

- **Mutopia Project** (mutopiaproject.org): LilyPond + MIDI, mostly CC BY-SA or public domain.
  Search: `https://www.mutopiaproject.org/cgibin/make-table.cgi?searchingfor=<piece>&Composer=BachJS`.
  The Goldberg Aria is `ftp/BachJS/BWV988/bwv-988-aria/bwv-988-aria.mid` (CC BY-SA 3.0: credit
  it and keep the licence on derived data such as score.js).
- Check the MIDI with `pretty_midi`: tempo, time signature, one instrument per voice (Mutopia
  keyboard files are usually "upper" and "lower"), and print a few bars to compare with the
  printed score. Ornaments are usually written out as fast notes; draw those smaller.

### No score?

For a recording with no MIDI (a song, the user's own playing), the notes can still follow the
music: use the onsets in `timing.json` (time, strength, pitch class) as the notes, put them on
the staff by pitch class (or by `librosa.pyin` pitch for a single melodic line), size them by
strength, and keep the constant travel speed so spacing still shows rhythm. Say that heights
are estimated. Bar lines still come from `analyze_audio.py` (give `--bar-seconds`).

## Choosing the excerpt (about 30 seconds)

- Count it in bars, not seconds: bar length x bars. A slow sarabande at ~4.4 s a bar gives
  7-8 bars in 30-35 s; tell the user when the music can't be cut to exactly 30 s without
  breaking a phrase.
- End on a cadence. A phrase that ends on the tonic sounds finished; a fade in the middle of
  a moving bass does not.
- **Splicing**: if the phrase that works best doesn't end cleanly, jump at a bar line to a bar
  with the same harmony and function elsewhere in the piece, ideally the piece's final bar.
  Here bars 1-7 (ending on the dominant D) were joined to bar 32 (the Aria's last bar, also
  D -> G), so the opening phrase walks straight into the ending.
  - Measure the level on both sides first (`ffmpeg -ss X -t 0.35 -i f -af volumedetect`); join
    where they're within ~2 dB.
  - Cut a few tens of ms before the downbeat attack on both sides, with a 20-40 ms crossfade,
    so the attack itself carries the join.
  - Don't splice into a sustained tail: a final chord's tail is often 10-20 dB quieter and dies
    fast, so the join sounds like a drop-out.
  ```
  ffmpeg -i full.flac -filter_complex "[0:a]atrim=1.20:31.80,asetpts=PTS-STARTPTS[a];\
  [0:a]atrim=292.30:297.2,asetpts=PTS-STARTPTS[b];[a][b]acrossfade=d=0.03:c1=qsin:c2=qsin,\
  afade=t=out:st=34.3:d=1.0[o]" -map "[o]" -c:a libmp3lame -b:a 192k excerpt.mp3
  ```
  Check the join with per-frame RMS (`astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level`):
  no dip deeper than the music's own.

## Timing: bar lines, beats, every note

1. `scripts/analyze_audio.py full.flac timing.json --beats-per-bar 3 --bars 8 --bass "G F# E D B C D G"`
   - Give the bass line when you know it: the script then fits the bar length to it and snaps
     each bar line to a low onset with the right bass pitch. Check `bass_hits` (8/8 here).
   - Without `--bass`, give `--bar-seconds` or `--end`. Plain tempo estimation locks onto
     subdivisions in slow music (it guessed 1.1 s for a 4.4 s bar).
   - `--repeat-search` prints when the opening comes back, to see repeats (the Aria's A section
     returns after 74.2 s).
   - For a later section, run again with `--start` near its first downbeat.
2. Write `slots.json`: for each bar of the film, the score bar, the performed bar in timing.json
   and the audio -> film offset (`length` for a final bar that rings on).
3. `scripts/align_score.py score.mid timing.json slots.json js/score.js --beats-per-bar 3`
   prints the upper voice with times; spot-check a few against what you hear (ornament runs
   should be tightly packed, the downbeat note exactly on the bar line).

`score.js` gives `bars` (film time of each downbeat), `beats`, and `notes`
`[time, pitch, beats long, voice, bar, beat]`. The kit turns this into: shots cut on `bars`,
notes born at `time`, hand presses, key lights, pendulum swings on `beats`.

## Making the notes read as music

- Height = pitch on a treble staff (`step`: E4 bottom line = 0, ledger lines above F5/below D4).
- Shape = length: two flags for 16ths, one for 8ths, hollow head for half notes, small heads
  for ornaments.
- One colour per letter name, always the same, so repeated pitches are recognisable.
- Constant travel speed along the staff, so the gaps between notes *are* the rhythm.
- Notes appear exactly when played. If the source (instrument) is on screen they pop with a
  small burst; otherwise they slide in from the edge already travelling.
- The bass gets its own visual (stones, dots along the bottom), one per bar, landing on the
  downbeat.

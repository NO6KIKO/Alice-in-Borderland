# The cut: one timeline shared by the picture (trailer/edit.py) and the score (trailer/music.py). Times in seconds.
# Act II cuts sit on a 100 BPM grid (beat 0.6 s) that starts at PULSE.
FPS = 30
BEAT = 0.6
PULSE = 36.4          # Act II ostinato starts
MONT = 76.0           # Act III montage starts
DARK = 88.0           # hard cut to silence
TITLE = 92.4          # title impact
END = 98.8            # end card
TOTAL = 104.0

# picture clips: (start, end, shot id, source in-point, transition-in) — 'fade' from black, 'x' dissolve, None hard cut
CLIPS = [
    (3.0, 10.5, 'a1_aerial', 0.0, 'fade'),
    (10.5, 15.5, 'a2_tower_street', 0.5, 'x'),
    (15.5, 20.5, 'a3_airship', 0.5, 'x'),
    (20.5, 24.5, 'a4_palace', 0.4, 'x'),
    (24.5, 28.5, 'a5_port', 0.5, 'x'),
    (31.0, 36.0, 'a6_compound', 0.3, None),
    (36.4, 41.2, 'b1_bulb_flood', 0.1, None),
    (41.2, 43.6, 'b2_bulb', 0.7, None),
    (43.6, 47.2, 'b3_court', 0.5, None),
    (47.2, 51.4, 'b4_arena', 0.4, None),
    (51.4, 54.4, 'b5_clubs', 0.5, None),
    (54.4, 58.0, 'b6_hearts', 0.5, None),
    (60.4, 63.4, 'b7_fire', 0.5, None),
    (63.4, 66.4, 'b8_hunt', 0.5, None),
    (66.4, 68.8, 'm2_gunman_b', 0.3, None),
    (68.8, 70.6, 'b9_konbini', 0.6, None),
    (70.6, 73.6, 'b10_prison', 0.5, None),
    (89.8, 98.8, 'e1_tower', 0.0, 'fade'),
]
# Act III montage: snippets (shot, in-point) — 8 × 0.6 s, then 8 × 0.3 s, then the arena push, then the card strobe
_snA = [('b8_hunt', 1.2), ('b1_bulb_flood', 2.6), ('b3_court', 2.2), ('m2_gunman_b', 1.6), ('b7_fire', 2.0), ('b4_arena', 3.0), ('b6_hearts', 3.2), ('b2_bulb', 2.4)]
_snB = [('a3_airship', 3.2), ('b10_prison', 2.6), ('b9_konbini', 1.2), ('b5_clubs', 2.5), ('a6_compound', 3.6), ('m2_gunman_b', .4), ('b1_bulb_flood', 4.0), ('b8_hunt', 3.0)]
t = MONT
for s, i in _snA: CLIPS.append((t, t + BEAT, s, i, None)); t += BEAT
for s, i in _snB: CLIPS.append((t, t + BEAT / 2, s, i, None)); t += BEAT / 2
CLIPS.append((t, t + 2.4, 'b4_arena', 1.4, 'punch')); t += 2.4          # 83.2 → 85.6
STROBE = (t, DARK)                                                       # 85.6 → 88.0: court cards, 0.2 s each
CARDS = ['KS', 'QH', 'JD', 'KC', 'QS', 'JH', 'KD', 'QC', 'JS', 'KH', 'QD', 'JC']
FLASH_CARDS = [(MONT + i * BEAT, CARDS[(i * 5) % 12]) for i in range(8)]   # 3-frame card flash at each Act III cut

# on-screen text: (start, end, main line, sub line, style) — 'card' centred on black / picture, 'label' lower-left game tag
TEXT = [
    (0.7, 3.0, '那一天，东京的人消失了。', 'ONE DAY, TOKYO FELL SILENT', 'card'),
    (28.7, 31.0, '想活下去吗？', 'DO YOU WANT TO LIVE?', 'card'),
    (32.6, 36.0, '那就——参加游戏。', 'THEN PLAY THE GAME', 'lower'),
    (36.9, 41.0, '♦4　电灯泡', 'GAME · LIGHT BULB', 'label'),
    (43.9, 47.0, '♦K　审判之塔', 'GAME · THE COURT', 'label'),
    (47.5, 51.2, '♣　黑色仓库', 'GAME · THE BEAMS', 'label'),
    (54.7, 57.8, '♥Q　屋顶庭园', 'GAME · CROQUET', 'label'),
    (58.2, 60.4, '通关，或者死亡。', 'CLEAR THE GAME — OR DIE', 'card'),
    (63.7, 68.6, '♠　狩猎', 'GAME · THE HUNT', 'label'),
    (73.8, 76.0, '你的签证，今天到期。', 'YOUR VISA EXPIRES TODAY', 'card'),
    (END + .5, TOTAL - .3, 'GAME START', '2027　即将开幕　·　COMING 2027', 'end'),
]
# beats where picture and score hit together (flash frame + impact)
HITS = [31.0, 36.0, 58.0, 60.4, 73.6, MONT, 83.2, TITLE, END]
GUNFIRE = [(63.6, 66.3), (66.4, 68.7), (MONT, MONT + BEAT), (MONT + 3 * BEAT, MONT + 4 * BEAT), (80.8 + 5 * BEAT / 2, 80.8 + 6 * BEAT / 2), (80.8 + 7 * BEAT / 2, 80.8 + 8 * BEAT / 2)]

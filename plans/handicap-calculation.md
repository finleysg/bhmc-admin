The import scores process needs to be more robust when golf genius does not return a course handicap and the handicap_dots_by_hole are all zeroes even though the player's index shows he should be getting shots.

Write a plan to calculate the course handicap from the player's index and the tee data. Example tee data

```json
"tee": {
"name": "Blue/White",
"abbreviation": "BW",
"hole_data": {
"par": [4, 5, 3, 4, 5, 4, 4, 3, 4, null, null, null, null, null, null, null, null, null],
"yardage": [
402,
530,
165,
351,
520,
405,
380,
200,
370,
null,
null,
null,
null,
null,
null,
null,
null,
null
],
"handicap": [1, 5, 8, 9, 6, 4, 2, 3, 7, null, null, null, null, null, null, null, null, null]
},
"nine_hole_course": true,
"created_at": "2022-04-06 09:06:01 -0400",
"updated_at": "2025-04-23 08:18:27 -0400",
"color": "#00dbff",
"id": "8363454323945950121",
"slope_and_rating": {
"all18": { "rating": 35.9, "slope": 127 },
"front9": { "rating": 35.9, "slope": 127 },
"back9": { "rating": null, "slope": null }
},
"course_id": "5564053591657859899",
"parent_id": "",
"hole_labels": [
"1",
"2",
"3",
"4",
"5",
"6",
"7",
"8",
"9",
"10",
"11",
"12",
"13",
"14",
"15",
"16",
"17",
"18"
]
},
```

In this case, the player has an index of 6.7 and this is a 9 hole event, so their course handicap is 4 shots, and they get those shots on holes 1, 6, 7, and 8.

9 Hole Formula

```
Course Handicap = (Handicap Index / 2​) × (9 Hole Slope Rating / 113​) + (9 Hole Course Rating − 9 Hole Par)
```

18 Hole Formula

```
Course Handicap = Handicap Index x (Slope Rating / 113) + (Course Rating - Par)
```

Maintain full precision in intermediary calculations. Rounding is performed only once and as the last step.

IMPORTANT: design functional methods to do handicap calculations with good test coverage.
